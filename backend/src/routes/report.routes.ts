import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { freezeEscrowForDispute } from "../services/escrow.service";

export const reportRouter = Router();

// ------------------------------------------------------------
// FILE A REPORT — either party can flag the other, a job, or a message.
// `reason` is a free-text field on the schema (not a fixed enum) so new
// categories can be added on the client without a migration; the mobile
// app still presents a fixed, friendly set of options (see ReportUserScreen).
// If tied to an in-progress job, we also flip the job to DISPUTED and
// freeze any funded escrow so money can't move until an admin looks at it.
// ------------------------------------------------------------
const reportSchema = z.object({
  targetType: z.enum(["USER", "JOB", "MESSAGE"]),
  targetUserId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
  reason: z.string().min(2).max(100),
  details: z.string().max(2000).optional(),
});

reportRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = reportSchema.parse(req.body);
    if (data.targetType === "USER" && !data.targetUserId) {
      throw new ApiError(400, "targetUserId is required when reporting a user");
    }
    if (data.targetUserId === req.auth!.userId) throw new ApiError(400, "You cannot report yourself");

    const report = await prisma.report.create({
      data: {
        reporterId: req.auth!.userId,
        targetType: data.targetType,
        targetUserId: data.targetUserId,
        jobId: data.jobId,
        reason: data.reason,
        details: data.details,
      },
    });

    if (data.jobId) {
      const job = await prisma.job.findUnique({ where: { id: data.jobId }, include: { escrow: true } });
      if (job && ["ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(job.status)) {
        await prisma.job.update({ where: { id: job.id }, data: { status: "DISPUTED" } });
        if (job.escrow && job.escrow.status === "FUNDED") {
          await freezeEscrowForDispute(job.id);
        }
      }
    }

    res.status(201).json(report);
  })
);

// A user's own filed reports (so they can track status)
reportRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
      where: { reporterId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(reports);
  })
);

// ------------------------------------------------------------
// ADMIN: view + resolve reports.
// ------------------------------------------------------------
reportRouter.get(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || undefined;
    const reports = await prisma.report.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        targetUser: { select: { id: true, firstName: true, lastName: true, accountStatus: true } },
        job: { select: { id: true, title: true, status: true } },
      },
    });
    res.json(reports);
  })
);

const resolveSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED", "REVIEWING"]),
});

reportRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = resolveSchema.parse(req.body);
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        resolvedAt: data.status === "RESOLVED" || data.status === "DISMISSED" ? new Date() : null,
      },
    });

    if (report.targetUserId) {
      await prisma.adminAction.create({
        data: {
          adminId: req.auth!.userId,
          targetUserId: report.targetUserId,
          type: data.status === "RESOLVED" ? "RESOLVE_REPORT" : "DISMISS_REPORT",
          reason: `Report ${report.id} marked ${data.status}`,
        },
      });
    }

    res.json(report);
  })
);
