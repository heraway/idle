import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { notifyNewBid, notifyBidAccepted } from "../services/notification.service";

export const bidRouter = Router();

const bidSchema = z.object({
  jobId: z.string().uuid(),
  amount: z.number().positive(),
  message: z.string().max(500).optional(),
});

// ------------------------------------------------------------
// PLACE A BID
// ------------------------------------------------------------
bidRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = bidSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.status !== "OPEN") throw new ApiError(400, "This job is no longer accepting bids");
    if (job.hirerId === req.auth!.userId) throw new ApiError(400, "You cannot bid on your own job");

    // Gate: if the hirer required ID verification, block unverified bidders up front.
    if (job.requiresIdVerification) {
      const bidder = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
      if (bidder?.verificationStatus !== "VERIFIED") {
        throw new ApiError(
          403,
          "This job requires ID verification before you can bid. Verify your identity in Settings > Verification."
        );
      }
    }

    const bid = await prisma.bid.upsert({
      where: { jobId_bidderId: { jobId: data.jobId, bidderId: req.auth!.userId } },
      update: { amount: data.amount, message: data.message, status: "PENDING" },
      create: { jobId: data.jobId, bidderId: req.auth!.userId, amount: data.amount, message: data.message },
    });

    await notifyNewBid(job.hirerId, job.title, data.amount);
    res.status(201).json(bid);
  })
);

bidRouter.post(
  "/:id/withdraw",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bid = await prisma.bid.findUnique({ where: { id: req.params.id } });
    if (!bid) throw new ApiError(404, "Bid not found");
    if (bid.bidderId !== req.auth!.userId) throw new ApiError(403, "Not your bid");
    const updated = await prisma.bid.update({ where: { id: bid.id }, data: { status: "WITHDRAWN" } });
    res.json(updated);
  })
);

// ------------------------------------------------------------
// ACCEPT A BID — assigns worker, rejects other bids, opens escrow
// ------------------------------------------------------------
bidRouter.post(
  "/:id/accept",
  requireAuth,
  asyncHandler(async (req, res) => {
    const bid = await prisma.bid.findUnique({ where: { id: req.params.id }, include: { job: true } });
    if (!bid) throw new ApiError(404, "Bid not found");
    if (bid.job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can accept bids");
    if (bid.job.status !== "OPEN") throw new ApiError(400, "This job is no longer open");

    await prisma.$transaction([
      prisma.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } }),
      prisma.bid.updateMany({
        where: { jobId: bid.jobId, id: { not: bid.id }, status: "PENDING" },
        data: { status: "REJECTED" },
      }),
      prisma.job.update({
        where: { id: bid.jobId },
        data: { status: "ASSIGNED", workerId: bid.bidderId, assignedAt: new Date() },
      }),
      prisma.jobAssignment.create({ data: { jobId: bid.jobId, bidId: bid.id } }),
      prisma.message.create({
        data: { jobId: bid.jobId, senderId: req.auth!.userId, systemEvent: "BID_ACCEPTED", body: "Bid accepted — job assigned." },
      }),
    ]);

    await notifyBidAccepted(bid.bidderId, bid.job.title);
    res.json({ ok: true });
  })
);
