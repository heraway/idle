import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";
import { io } from "../index";
import { assertClean } from "../utils/profanityFilter";

export const messageRouter = Router();

async function assertParticipant(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new ApiError(404, "Job not found");
  const isAssignedWorker = await prisma.jobAssignment.findFirst({ where: { jobId, workerId: userId } });
  if (job.hirerId !== userId && !isAssignedWorker) {
    throw new ApiError(403, "You are not part of this job's conversation");
  }
  return job;
}

// ------------------------------------------------------------
// CONVERSATIONS — every job chat the current user is part of (as hirer or as
// an assigned worker), newest activity first. Powers the Messages tab.
// ------------------------------------------------------------
messageRouter.get(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const jobs = await prisma.job.findMany({
      where: {
        OR: [{ hirerId: userId }, { assignments: { some: { workerId: userId } } }],
        status: { not: "CANCELLED" },
      },
      include: {
        hirer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        assignments: { include: { worker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const rows = jobs
      .map((j) => {
        const last = j.messages[0];
        const iAmHirer = j.hirerId === userId;
        const others = iAmHirer ? j.assignments.map((a) => a.worker) : [j.hirer];
        return {
          jobId: j.id,
          jobTitle: j.title,
          status: j.status,
          iAmHirer,
          counterparts: others,
          lastMessage: last
            ? {
                body: last.body,
                hasImage: !!last.imageUrl,
                hasLocation: last.latitude != null,
                systemEvent: last.systemEvent,
                senderId: last.senderId,
                createdAt: last.createdAt,
              }
            : null,
          sortKey: (last?.createdAt ?? j.updatedAt).getTime(),
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey)
      .map(({ sortKey, ...rest }) => rest);

    res.json(rows);
  })
);

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
    assertClean(data.body, "message");
    await assertParticipant(data.jobId, req.auth!.userId);
    const message = await prisma.message.create({
      data: { jobId: data.jobId, senderId: req.auth!.userId, body: data.body },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    });

    // Broadcast message via Socket.IO to room members
    io.to(`job_${data.jobId}`).emit("newMessage", message);

    res.status(201).json(message);
  })
);

messageRouter.post(
  "/with-photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const jobId = req.body.jobId as string;
    if (!jobId) throw new ApiError(400, "jobId is required");
    if (req.body.body) assertClean(req.body.body, "message");
    await assertParticipant(jobId, req.auth!.userId);
    if (!req.file) throw new ApiError(400, "No photo uploaded");
    const message = await prisma.message.create({
      data: {
        jobId,
        senderId: req.auth!.userId,
        // Message.body is a required column, so a photo-only message stores "".
        body: req.body.body || "",
        imageUrl: publicUrlFor(req.file.filename, req),
      },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    });

    // Broadcast message with image attachment via Socket.IO to room members
    io.to(`job_${jobId}`).emit("newMessage", message);

    res.status(201).json(message);
  })
);

// ------------------------------------------------------------
// SHARE A LOCATION PIN — typically the hirer sending the exact job site to
// the assigned worker. Only job participants can post, and only participants
// can read the chat, so exact coordinates never reach other bidders.
// ------------------------------------------------------------
const locationSchema = z.object({
  jobId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(200).optional(),
});

messageRouter.post(
  "/location",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = locationSchema.parse(req.body);
    if (data.label) assertClean(data.label, "location label");
    await assertParticipant(data.jobId, req.auth!.userId);
    const message = await prisma.message.create({
      data: {
        jobId: data.jobId,
        senderId: req.auth!.userId,
        body: "",
        latitude: data.latitude,
        longitude: data.longitude,
        locationLabel: data.label || null,
      },
      include: { sender: { select: { id: true, firstName: true, avatarUrl: true } } },
    });
    io.to(`job_${data.jobId}`).emit("newMessage", message);
    res.status(201).json(message);
  })
);
