import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireAdmin, requireSuperAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { refundEscrow } from "../services/escrow.service";
import { sanitizeUser } from "./auth.routes";

export const adminRouter = Router();

// Every admin route requires an authenticated admin/superadmin.
adminRouter.use(requireAuth, requireAdmin);

// ------------------------------------------------------------
// DASHBOARD OVERVIEW — quick counts for a landing screen.
// ------------------------------------------------------------
adminRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const [users, activeJobs, disputedJobs, openReports, bannedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.job.count({ where: { status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED"] } } }),
      prisma.job.count({ where: { status: "DISPUTED" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.user.count({ where: { accountStatus: "BANNED" } }),
    ]);
    res.json({ users, activeJobs, disputedJobs, openReports, bannedUsers });
  })
);

// ------------------------------------------------------------
// USERS — list, filter, and moderate
// ------------------------------------------------------------
adminRouter.get(
  "/users",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const q = req.query.q as string | undefined;
    const users = await prisma.user.findMany({
      where: {
        accountStatus: status ? (status as any) : undefined,
        OR: q
          ? [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(users.map(sanitizeUser));
  })
);

const moderateSchema = z.object({ reason: z.string().min(3).max(1000) });

adminRouter.post(
  "/users/:id/suspend",
  asyncHandler(async (req, res) => {
    const data = moderateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { accountStatus: "SUSPENDED" } });
    await prisma.adminAction.create({
      data: { adminId: req.auth!.userId, targetUserId: user.id, type: "SUSPEND_USER", reason: data.reason },
    });
    res.json(sanitizeUser(user));
  })
);

adminRouter.post(
  "/users/:id/ban",
  asyncHandler(async (req, res) => {
    const data = moderateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { accountStatus: "BANNED" } });
    await prisma.adminAction.create({
      data: { adminId: req.auth!.userId, targetUserId: user.id, type: "BAN_USER", reason: data.reason },
    });
    res.json(sanitizeUser(user));
  })
);

adminRouter.post(
  "/users/:id/reinstate",
  asyncHandler(async (req, res) => {
    const data = moderateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { accountStatus: "ACTIVE" } });
    await prisma.adminAction.create({
      data: { adminId: req.auth!.userId, targetUserId: user.id, type: "REINSTATE_USER", reason: data.reason },
    });
    res.json(sanitizeUser(user));
  })
);

// Promote/demote admins — restricted to super-admins only. Not logged to
// AdminAction since AdminActionType doesn't currently include a role-change
// variant; add one (e.g. "CHANGE_ROLE") to the enum + migrate if you want
// this audited too.
const roleSchema = z.object({ role: z.enum(["USER", "ADMIN", "SUPERADMIN"]) });
adminRouter.post(
  "/users/:id/role",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = roleSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role: data.role } });
    res.json(sanitizeUser(user));
  })
);

// ------------------------------------------------------------
// JOBS — oversee, force-cancel any job (e.g. reported / fraudulent / unsafe),
// auto-refunding escrow if it was funded.
// ------------------------------------------------------------
adminRouter.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const jobs = await prisma.job.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: { hirer: { select: { id: true, firstName: true, lastName: true } }, worker: { select: { id: true, firstName: true, lastName: true } }, escrow: true },
      take: 100,
    });
    res.json(jobs);
  })
);

adminRouter.post(
  "/jobs/:id/cancel",
  asyncHandler(async (req, res) => {
    const data = moderateSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: req.params.id }, include: { escrow: true } });
    if (!job) throw new ApiError(404, "Job not found");

    const updated = await prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });

    if (job.escrow && (job.escrow.status === "FUNDED" || job.escrow.status === "DISPUTED_HOLD")) {
      await refundEscrow(job.id);
    }

    await prisma.adminAction.create({
      data: { adminId: req.auth!.userId, targetJobId: job.id, type: "CANCEL_JOB", reason: data.reason },
    });

    res.json(updated);
  })
);

// ------------------------------------------------------------
// AUDIT LOG — every moderation action, for accountability.
// ------------------------------------------------------------
adminRouter.get(
  "/actions",
  asyncHandler(async (_req, res) => {
    const actions = await prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        admin: { select: { id: true, firstName: true, lastName: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(actions);
  })
);
