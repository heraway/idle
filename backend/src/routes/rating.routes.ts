import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const ratingRouter = Router();

const rateSchema = z.object({
  jobId: z.string().uuid(),
  toUserId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
  liked: z.boolean().optional().default(false),
  comment: z.string().max(500).optional(),
});

// Either party (hirer <-> worker) can rate the other, once the job is COMPLETED.
// The "liked" flag is a lightweight trust signal shown as a badge count,
// separate from the 1-5 star average.
ratingRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = rateSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.status !== "COMPLETED") throw new ApiError(400, "You can only rate after the job is completed");

    const isHirer = job.hirerId === req.auth!.userId;
    const isWorker = job.workerId === req.auth!.userId;
    if (!isHirer && !isWorker) throw new ApiError(403, "You were not part of this job");

    const expectedTarget = isHirer ? job.workerId : job.hirerId;
    if (data.toUserId !== expectedTarget) throw new ApiError(400, "You can only rate the other party on this job");

    const rating = await prisma.rating.upsert({
      where: { jobId_fromUserId_toUserId: { jobId: data.jobId, fromUserId: req.auth!.userId, toUserId: data.toUserId } },
      update: { stars: data.stars, liked: data.liked, comment: data.comment },
      create: { jobId: data.jobId, fromUserId: req.auth!.userId, toUserId: data.toUserId, stars: data.stars, liked: data.liked, comment: data.comment },
    });

    // Recompute the target's aggregate trust stats.
    const allRatings = await prisma.rating.findMany({ where: { toUserId: data.toUserId } });
    const avg = allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length;
    const likeCount = allRatings.filter((r) => r.liked).length;

    await prisma.user.update({
      where: { id: data.toUserId },
      data: { avgRating: Math.round(avg * 10) / 10, ratingCount: allRatings.length, likesReceived: likeCount },
    });

    res.status(201).json(rating);
  })
);

ratingRouter.get(
  "/user/:id",
  asyncHandler(async (req, res) => {
    const ratings = await prisma.rating.findMany({
      where: { toUserId: req.params.id },
      orderBy: { createdAt: "desc" },
      include: { fromUser: { select: { id: true, firstName: true, avatarUrl: true } }, job: { select: { title: true } } },
    });
    res.json(ratings);
  })
);
