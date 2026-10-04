import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { resolvePrefs, SUPPORTED_LANGUAGES } from "../utils/notificationPrefs";

// Mounted at /users alongside userRouter. Holds the Settings-screen endpoints:
//   GET/PATCH /users/me/settings   language + notification preferences
//   GET       /users/me/contacts   people you've dealt with (for "Report a user")
//   DELETE    /users/me            delete (anonymise) your account
export const accountRouter = Router();

accountRouter.get(
  "/me/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { language: true, notificationPrefs: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json({ language: user.language ?? "en", notificationPrefs: resolvePrefs(user.notificationPrefs) });
  })
);

const settingsSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
  notificationPrefs: z
    .object({
      push: z.boolean().optional(),
      bids: z.boolean().optional(),
      jobs: z.boolean().optional(),
      questions: z.boolean().optional(),
    })
    .optional(),
});

accountRouter.patch(
  "/me/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = settingsSchema.parse(req.body);
    const existing = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { notificationPrefs: true },
    });
    if (!existing) throw new ApiError(404, "User not found");

    const update: Prisma.UserUpdateInput = {};
    if (data.language) update.language = data.language;
    if (data.notificationPrefs) {
      update.notificationPrefs = { ...resolvePrefs(existing.notificationPrefs), ...data.notificationPrefs };
    }
    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: update,
      select: { language: true, notificationPrefs: true },
    });
    res.json({ language: user.language ?? "en", notificationPrefs: resolvePrefs(user.notificationPrefs) });
  })
);

// ------------------------------------------------------------
// CONTACTS - everyone the user has actually dealt with on the platform:
// workers hired on their jobs, people who bid on their jobs, hirers they
// were hired by, and hirers they bid with. Used by Settings > Report a user
// so you can only report people you've interacted with (no user directory).
// ------------------------------------------------------------
const personSelect = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

accountRouter.get(
  "/me/contacts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const uid = req.auth!.userId;
    const [hired, bidders, hiredBy, bidOn] = await Promise.all([
      prisma.jobAssignment.findMany({
        where: { job: { hirerId: uid } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { worker: { select: personSelect } },
      }),
      prisma.bid.findMany({
        where: { job: { hirerId: uid } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { bidder: { select: personSelect } },
      }),
      prisma.jobAssignment.findMany({
        where: { workerId: uid },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { job: { select: { hirer: { select: personSelect } } } },
      }),
      prisma.bid.findMany({
        where: { bidderId: uid },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { job: { select: { hirer: { select: personSelect } } } },
      }),
    ]);

    const people = [
      ...hired.map((r) => r.worker),
      ...bidders.map((r) => r.bidder),
      ...hiredBy.map((r) => r.job.hirer),
      ...bidOn.map((r) => r.job.hirer),
    ];
    const seen = new Set<string>([uid]);
    const contacts = people.filter((p) => {
      if (seen.has(p.id) || p.firstName === "Deleted") return false;
      seen.add(p.id);
      return true;
    });
    res.json(contacts);
  })
);

// ------------------------------------------------------------
// DELETE ACCOUNT
// Rows elsewhere (jobs, bids, messages, ratings, reports) reference the user,
// and other people's job history and dispute records must stay intact. So
// deletion = anonymise: every personal field is wiped, the login email is
// replaced, the password is made unusable, and deletedAt is set (requireAuth
// rejects deleted accounts, so any token still in circulation stops working).
// Blocked while money or work is in flight so no one is left stranded.
// ------------------------------------------------------------
const deleteSchema = z.object({ password: z.string().min(1, "Password is required") });

function removeStoredAvatar(url?: string | null) {
  if (!url || !url.startsWith("/uploads/")) return;
  const file = path.resolve(process.env.UPLOAD_DIR || "./uploads", path.basename(url));
  fs.unlink(file, () => {});
}

accountRouter.delete(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = deleteSchema.parse(req.body);
    const uid = req.auth!.userId;

    const user = await prisma.user.findUnique({ where: { id: uid } });
    if (!user) throw new ApiError(404, "User not found");
    if (user.role !== "USER") throw new ApiError(400, "Admin accounts can't be deleted from the app.");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new ApiError(401, "Password is incorrect");

    const activeJobs = await prisma.job.count({
      where: {
        status: { in: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "DISPUTED"] },
        OR: [{ hirerId: uid }, { assignments: { some: { workerId: uid } } }],
      },
    });
    if (activeJobs > 0) {
      throw new ApiError(
        400,
        "You have jobs that are assigned, in progress, awaiting confirmation or in dispute. Finish or resolve them before deleting your account."
      );
    }

    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    await prisma.$transaction([
      prisma.job.updateMany({ where: { hirerId: uid, status: "OPEN" }, data: { status: "CANCELLED" } }),
      prisma.bid.updateMany({ where: { bidderId: uid, status: "PENDING" }, data: { status: "WITHDRAWN" } }),
      prisma.user.update({
        where: { id: uid },
        data: {
          email: `deleted-${uid}@deleted.invalid`,
          phone: null,
          passwordHash,
          firstName: "Deleted",
          lastName: "User",
          bio: null,
          socialLinks: Prisma.DbNull,
          avatarUrl: null,
          latitude: null,
          longitude: null,
          city: null,
          country: null,
          pushToken: null,
          verificationRef: null,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          language: null,
          notificationPrefs: Prisma.DbNull,
          deletedAt: new Date(),
        },
      }),
    ]);

    removeStoredAvatar(user.avatarUrl);
    res.json({ ok: true, message: "Your account has been deleted." });
  })
);
