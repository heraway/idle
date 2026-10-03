import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { upload } from "../services/upload.service";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { sanitizeUser } from "./auth.routes";
import { ApiError } from "../utils/ApiError";

export const userRouter = Router();

userRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new ApiError(404, "User not found");
    res.json(sanitizeUser(user));
  })
);

// Optional social/profile links. Empty = not set. Only http(s) URLs are accepted
// (a bare "instagram.com/me" gets https:// prepended) so nothing like
// "javascript:" can ever be stored and later opened by another user.
const linkField = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw new Error("bad");
      return url;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please enter a valid link" });
      return z.NEVER;
    }
  });

const socialLinksSchema = z.object({
  website: linkField,
  instagram: linkField,
  facebook: linkField,
  linkedin: linkField,
  tiktok: linkField,
  x: linkField,
});

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().max(500).nullable().optional(),
  socialLinks: socialLinksSchema.nullable().optional(),
  avatarUrl: z.string().url().optional(),
  hoursPerDayAvailable: z.number().int().min(1).max(24).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  pushToken: z.string().nullable().optional(),
});

userRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { bio, socialLinks, ...rest } = updateSchema.parse(req.body);
    const data: Prisma.UserUpdateInput = { ...rest };
    if (bio !== undefined) data.bio = bio && bio.trim() ? bio.trim() : null;
    if (socialLinks !== undefined) {
      const clean = Object.fromEntries(Object.entries(socialLinks ?? {}).filter(([, v]) => !!v));
      data.socialLinks = Object.keys(clean).length ? clean : Prisma.DbNull;
    }
    const user = await prisma.user.update({ where: { id: req.auth!.userId }, data });
    res.json(sanitizeUser(user));
  })
);

const pushTokenSchema = z.object({
  pushToken: z.string().min(1),
});

userRouter.post(
  "/me/push-token",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { pushToken } = pushTokenSchema.parse(req.body);
    await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { pushToken },
    });
    res.json({ ok: true, message: "Push token updated" });
  })
);

// ------------------------------------------------------------
// PROFILE PICTURE — uses the shared multer upload pipeline (same /uploads
// folder and file rules as job/chat photos). The stored value is the relative
// path "/uploads/<file>"; clients resolve it against the API base URL, so it
// keeps working if the host or protocol changes.
// ------------------------------------------------------------
function removeStoredAvatar(url?: string | null) {
  if (!url || !url.startsWith("/uploads/")) return;
  const file = path.resolve(process.env.UPLOAD_DIR || "./uploads", path.basename(url));
  fs.unlink(file, () => {});
}

userRouter.post(
  "/me/avatar",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "No photo uploaded");
    const existing = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { avatarUrl: true } });
    const user = await prisma.user.update({
      where: { id: req.auth!.userId },
      data: { avatarUrl: `/uploads/${req.file.filename}` },
    });
    removeStoredAvatar(existing?.avatarUrl);
    res.json(sanitizeUser(user));
  })
);

userRouter.delete(
  "/me/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.auth!.userId }, select: { avatarUrl: true } });
    const user = await prisma.user.update({ where: { id: req.auth!.userId }, data: { avatarUrl: null } });
    removeStoredAvatar(existing?.avatarUrl);
    res.json(sanitizeUser(user));
  })
);

// Public-safe profile view — used when viewing another user's trust profile
// (ratings, likes, verification badge) before accepting a bid or job.
userRouter.get(
  "/:id/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        socialLinks: true,
        city: true,
        country: true,
        avgRating: true,
        ratingCount: true,
        likesReceived: true,
        verificationStatus: true,
        hoursPerDayAvailable: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  })
);

// Ratings/reviews/references this user has received. "Reviewer role" is
// derived from the job: the job's poster is an Employer, anyone else a Worker.
userRouter.get(
  "/:id/reviews",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ratings = await prisma.rating.findMany({
      where: { toUserId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        stars: true,
        comment: true,
        reference: true,
        createdAt: true,
        fromUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        job: { select: { id: true, title: true, hirerId: true } },
      },
    });
    res.json(
      ratings.map((r) => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        reference: r.reference,
        createdAt: r.createdAt,
        reviewerRole: r.job.hirerId === r.fromUser.id ? "Employer" : "Worker",
        reviewer: r.fromUser,
        job: { id: r.job.id, title: r.job.title },
      }))
    );
  })
);

// Work history, from real jobs/assignments. Privacy: viewing someone else
// shows only their COMPLETED jobs and never the pay; the owner sees every
// status plus pay. Job details themselves go through GET /jobs/:id, which
// keeps applying its own location masking.
userRouter.get(
  "/:id/history",
  requireAuth,
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const isOwner = req.auth!.userId === targetId;
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new ApiError(404, "User not found");
    const statusFilter = isOwner ? {} : { status: "COMPLETED" as const };

    const [postedJobs, assignments] = await Promise.all([
      prisma.job.findMany({
        where: { hirerId: targetId, ...statusFilter },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          payType: true,
          budgetMin: true,
          budgetMax: true,
          currency: true,
          createdAt: true,
          completedAt: true,
          assignments: { select: { bid: { select: { amount: true } } } },
          ratings: { where: { toUserId: targetId }, select: { stars: true, comment: true }, take: 1 },
        },
      }),
      prisma.jobAssignment.findMany({
        where: { workerId: targetId, job: statusFilter },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          bid: { select: { amount: true } },
          job: {
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              payType: true,
              currency: true,
              createdAt: true,
              completedAt: true,
              ratings: { where: { toUserId: targetId }, select: { stars: true, comment: true }, take: 1 },
            },
          },
        },
      }),
    ]);

    res.json({
      posted: postedJobs.map((j) => {
        const amounts = j.assignments.map((a) => a.bid.amount);
        return {
          jobId: j.id,
          title: j.title,
          category: j.category,
          status: j.status,
          date: j.completedAt ?? j.createdAt,
          pay: isOwner
            ? { amount: amounts.length === 1 ? amounts[0] : null, min: j.budgetMin, max: j.budgetMax, currency: j.currency, payType: j.payType }
            : null,
          rating: j.ratings[0] ?? null,
        };
      }),
      worked: assignments.map((a) => ({
        jobId: a.job.id,
        title: a.job.title,
        category: a.job.category,
        status: a.job.status,
        date: a.job.completedAt ?? a.job.createdAt,
        pay: isOwner ? { amount: a.bid.amount, min: null, max: null, currency: a.job.currency, payType: a.job.payType } : null,
        rating: a.job.ratings[0] ?? null,
      })),
    });
  })
);