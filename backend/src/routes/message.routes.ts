import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";

export const messageRouter = Router();

async function assertParticipant(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.hirerId !== userId && job.workerId !== userId) {
    throw new ApiError(403, "You are not part of this job's conversation");
  }
  return job;
}

messageRouter.get(
  "/job/:jobId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await assertParticipant(req.params.jobId, req.auth!.userId);
    const messages = await prisma.message.findMany({
      where: { jobId: req.params.jobId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    });
    res.json(messages);
  })
);

const sendSchema = z.object({ jobId: z.string().uuid(), body: z.string().min(1).max(2000) });
messageRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = sendSchema.parse(req.body);
    await assertParticipant(data.jobId, req.auth!.userId);
    const message = await prisma.message.create({
      data: { jobId: data.jobId, senderId: req.auth!.userId, body: data.body },
    });
    res.status(201).json(message);
  })
);

messageRouter.post(
  "/with-photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const jobId = req.body.jobId as string;
    await assertParticipant(jobId, req.auth!.userId);
    if (!req.file) throw new ApiError(400, "No photo uploaded");
    const message = await prisma.message.create({
      data: {
        jobId,
        senderId: req.auth!.userId,
        body: req.body.body || null,
        imageUrl: publicUrlFor(req.file.filename, req),
      },
    });
    res.status(201).json(message);
  })
);
