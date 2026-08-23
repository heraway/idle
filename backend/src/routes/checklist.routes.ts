import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";
import { notifyJobSubmitted } from "../services/notification.service";

export const checklistRouter = Router();

async function assertWorkerOnJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  if (job.workerId !== userId) throw new ApiError(403, "Only the assigned worker can update this checklist");
  return job;
}

// Add a checklist item (hirer, when defining the job's task breakdown)
const addItemSchema = z.object({ jobId: z.string().uuid(), label: z.string().min(1) });
checklistRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = addItemSchema.parse(req.body);
    const job = await prisma.job.findUnique({ where: { id: data.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can add checklist items");

    const count = await prisma.checklistItem.count({ where: { jobId: data.jobId } });
    const item = await prisma.checklistItem.create({ data: { jobId: data.jobId, label: data.label, order: count } });
    res.status(201).json(item);
  })
);

// Worker ticks an item off, optionally attaching a progress photo
checklistRouter.post(
  "/:id/complete",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const item = await prisma.checklistItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, "Checklist item not found");
    await assertWorkerOnJob(item.jobId, req.auth!.userId);

    const updated = await prisma.checklistItem.update({
      where: { id: item.id },
      data: {
        isDone: true,
        doneAt: new Date(),
        proofPhotoUrl: req.file ? publicUrlFor(req.file.filename) : item.proofPhotoUrl,
      },
    });

    await prisma.message.create({
      data: {
        jobId: item.jobId,
        senderId: req.auth!.userId,
        systemEvent: "CHECKLIST_ITEM_DONE",
        body: `Marked "${item.label}" as done`,
        imageUrl: req.file ? publicUrlFor(req.file.filename) : null,
      },
    });

    // Move the job into IN_PROGRESS on first ticked item.
    const job = await prisma.job.findUnique({ where: { id: item.jobId } });
    if (job && job.status === "ASSIGNED") {
      await prisma.job.update({ where: { id: item.jobId }, data: { status: "IN_PROGRESS" } });
    }

    res.json(updated);
  })
);

// Worker marks the whole job as submitted (all/most tasks done, ready for hirer review)
checklistRouter.post(
  "/job/:jobId/submit",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await assertWorkerOnJob(req.params.jobId, req.auth!.userId);
    const updated = await prisma.job.update({ where: { id: job.id }, data: { status: "SUBMITTED" } });
    await notifyJobSubmitted(job.hirerId, job.title);
    res.json(updated);
  })
);

// Hirer confirms completion -> releases escrow (see escrow.routes.ts) and closes the job
checklistRouter.post(
  "/job/:jobId/confirm-complete",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.jobId } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can confirm completion");
    if (job.status !== "SUBMITTED") throw new ApiError(400, "Job has not been submitted by the worker yet");

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    res.json(updated);
  })
);
