import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { fundEscrow, releaseEscrow, refundEscrow } from "../services/escrow.service";

export const escrowRouter = Router();

// ------------------------------------------------------------
// FUND — hirer pays into escrow once a bid is accepted (job status ASSIGNED).
// Funds are held by the platform (mock in dev; real processor in prod) until
// the hirer confirms the job is done, at which point they're released to
// the worker. This is what makes the "job seeker protection" real: workers
// only start real ongoing work once money is provably set aside.
// ------------------------------------------------------------
const fundSchema = z.object({ jobId: z.string().uuid(), amount: z.number().positive() });

escrowRouter.post(
  "/fund",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = fundSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can fund escrow");
    if (job.status !== "ASSIGNED") throw new ApiError(400, "Escrow can only be funded once a worker is assigned");

    const escrow = await fundEscrow(data.jobId, data.amount);
    res.status(201).json(escrow);
  })
);

// ------------------------------------------------------------
// RELEASE — happens automatically-ish once the hirer confirms completion,
// but exposed here too in case you want an explicit "release payment" button
// distinct from "confirm completion" (e.g. releasing a partial amount later).
// ------------------------------------------------------------
escrowRouter.post(
  "/:jobId/release",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can release escrow");
    if (job.status !== "SUBMITTED" && job.status !== "COMPLETED") {
      throw new ApiError(400, "Job must be submitted by the worker before releasing payment");
    }
    const escrow = await releaseEscrow(req.params.jobId);
    res.json(escrow);
  })
);

// ------------------------------------------------------------
// REFUND — hirer or admin can trigger this if a job is cancelled after
// funding, or as part of dispute resolution.
// ------------------------------------------------------------
escrowRouter.post(
  "/:jobId/refund",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new ApiError(404, "Job not found");

    const isHirer = job.hirerId === req.auth!.userId;
    const isAdmin = req.auth!.role === "ADMIN" || req.auth!.role === "SUPERADMIN";
    if (!isHirer && !isAdmin) throw new ApiError(403, "Only the hirer or an admin can refund escrow");

    const escrow = await refundEscrow(req.params.jobId);
    res.json(escrow);
  })
);

escrowRouter.get(
  "/:jobId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const escrow = await prisma.escrow.findUnique({ where: { jobId: req.params.jobId } });
    if (!escrow) throw new ApiError(404, "No escrow found for this job");
    res.json(escrow);
  })
);
