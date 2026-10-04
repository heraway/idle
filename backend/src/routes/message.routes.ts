import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";
import { io } from "../index";
import { assertClean } from "../utils/profanityFilter";
import { isAdminRole, isJobEnded } from "../utils/jobLocation";
import {
  MESSAGE_SENDER_SELECT,
  loadJobCtx,
  removeUploadedFile,
  serializeMessage,
} from "../services/chat.service";

export const messageRouter = Router();

const viewerOf = (req: { auth?: { userId: string; role: string } }) => ({ userId: req.auth!.userId, role: req.auth!.role });

// Hirer or an assigned worker of this job. Returns the job context used for
// location-privacy decisions.
async function assertParticipant(jobId: string, userId: string) {
  const job = await loadJobCtx(jobId);
  if (!job) throw new ApiError(404, "Job not found");
  const isAssignedWorker = job.assignments.some((a) => a.workerId === userId);
  if (job.hirerId !== userId && !isAssignedWorker) {
    throw new ApiError(403, "You are not part of this job's conversation");
  }
  return job;
}

// Sends a message event to every socket currently in the job room, serialised
// separately for each one so nobody receives more than they're allowed to see.
async function broadcastMessage(job: NonNullable<Awaited<ReturnType<typeof loadJobCtx>>>, message: any) {
  const sockets = await io.in(`job_${job.id}`).fetchSockets();
  for (const s of sockets) {
    const viewer = { userId: s.data.userId as string, role: (s.data.role as string) || "USER" };
    s.emit("newMessage", serializeMessage(message, job, viewer));
  }
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
        hirer: { select: MESSAGE_SENDER_SELECT },
        assignments: { include: { worker: { select: MESSAGE_SENDER_SELECT } } },
        // A deleted message never becomes the preview; deleting it just reveals the previous one.
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
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
                // A pin counts as "a location" in the preview, but never exposes coordinates here.
                hasLocation: last.latitude != null || last.locationKind != null,
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
    const job = await assertParticipant(req.params.jobId, req.auth!.userId);
    const messages = await prisma.message.findMany({
      where: { jobId: req.params.jobId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });
    const viewer = viewerOf(req);
    res.json(messages.map((m) => serializeMessage(m, job, viewer)));
  })
);

const sendSchema = z.object({ jobId: z.string().uuid(), body: z.string().min(1).max(2000) });
messageRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = sendSchema.parse(req.body);
    assertClean(data.body, "message");
    const job = await assertParticipant(data.jobId, req.auth!.userId);
    const message = await prisma.message.create({
      data: { jobId: data.jobId, senderId: req.auth!.userId, body: data.body },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });

    await broadcastMessage(job, message);
    res.status(201).json(serializeMessage(message, job, viewerOf(req)));
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
    const job = await assertParticipant(jobId, req.auth!.userId);
    if (!req.file) throw new ApiError(400, "No photo uploaded");
    const message = await prisma.message.create({
      data: {
        jobId,
        senderId: req.auth!.userId,
        // Message.body is a required column, so a photo-only message stores "".
        body: req.body.body || "",
        imageUrl: publicUrlFor(req.file.filename, req),
      },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });

    await broadcastMessage(job, message);
    res.status(201).json(serializeMessage(message, job, viewerOf(req)));
  })
);

// ------------------------------------------------------------
// SHARE THE JOB LOCATION — poster only, and only once someone is hired.
// The client sends NO coordinates: the server reads them from the job, and the
// message stores a reference only. Whether a given reader sees the pin is
// decided on every read by the job-location lifecycle (jobLocation.ts), so the
// pin stops resolving for the worker as soon as the job is completed/cancelled.
// ------------------------------------------------------------
const shareJobLocationSchema = z.object({ jobId: z.string().uuid() });

messageRouter.post(
  "/share-job-location",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { jobId } = shareJobLocationSchema.parse(req.body);
    const job = await assertParticipant(jobId, req.auth!.userId);
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the person who posted the job can share its location");
    if (job.assignments.length === 0) throw new ApiError(400, "You can share the exact location once you've hired someone");
    if (isJobEnded(job.status)) throw new ApiError(400, "This job is finished, so its location can no longer be shared");

    const message = await prisma.message.create({
      data: { jobId, senderId: req.auth!.userId, body: "", locationKind: "JOB_SITE" },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });
    await broadcastMessage(job, message);
    res.status(201).json(serializeMessage(message, job, viewerOf(req)));
  })
);

// ------------------------------------------------------------
// SHARE MY OWN LOCATION — strictly opt-in. A single snapshot, sent only when
// the user taps "share" and the request carries explicit consent. Nothing in
// the app ever sends this automatically, and the server never stores a user's
// location anywhere except on this message the user chose to send.
// ------------------------------------------------------------
const shareMyLocationSchema = z.object({
  jobId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  consent: z.literal(true, { errorMap: () => ({ message: "Sharing your location needs your explicit confirmation" }) }),
});

messageRouter.post(
  "/share-my-location",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = shareMyLocationSchema.parse(req.body);
    const job = await assertParticipant(data.jobId, req.auth!.userId);
    if (isJobEnded(job.status)) throw new ApiError(400, "This job is finished, so locations can no longer be shared in its chat");

    const message = await prisma.message.create({
      data: {
        jobId: data.jobId,
        senderId: req.auth!.userId,
        body: "",
        latitude: data.latitude,
        longitude: data.longitude,
        locationLabel: "My current location",
        locationKind: "PERSONAL",
      },
      include: { sender: { select: MESSAGE_SENDER_SELECT } },
    });
    await broadcastMessage(job, message);
    res.status(201).json(serializeMessage(message, job, viewerOf(req)));
  })
);

// Retired: the old endpoint accepted arbitrary client-supplied coordinates
// (including the job's exact location). Replaced by the two endpoints above.
messageRouter.post("/location", requireAuth, (_req, _res, next) => {
  next(new ApiError(410, "Please update the app to share locations in chat"));
});

// ------------------------------------------------------------
// DELETE A MESSAGE — only the person who sent it (or an admin, for moderation).
// It's a soft delete scoped to this one message: the content (text, photo,
// location) is wiped, but the row, the conversation and the other person
// stay exactly as they were. System events (bid accepted, checklist ticks)
// are part of the job's record and can't be deleted.
// ------------------------------------------------------------
messageRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.auth!.userId;
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) throw new ApiError(404, "Message not found");

    const isAdmin = isAdminRole(req.auth!.role);
    if (message.senderId !== userId && !isAdmin) {
      throw new ApiError(403, "You can only delete your own messages");
    }
    if (!isAdmin) await assertParticipant(message.jobId, userId);
    if (message.systemEvent) throw new ApiError(400, "Activity updates can't be deleted");

    if (!message.deletedAt) {
      await prisma.message.update({
        where: { id: message.id },
        data: { deletedAt: new Date(), body: "", imageUrl: null, latitude: null, longitude: null, locationLabel: null, locationKind: null },
      });
      removeUploadedFile(message.imageUrl);
      io.to(`job_${message.jobId}`).emit("messageDeleted", { id: message.id, jobId: message.jobId });
    }
    res.json({ ok: true, id: message.id });
  })
);
