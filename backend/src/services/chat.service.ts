import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma";
import { canSeePreciseLocation, isJobEnded, Viewer } from "../utils/jobLocation";

export const MESSAGE_SENDER_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

type JobCtx = {
  id: string;
  title: string;
  hirerId: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  assignments: { workerId: string }[];
};

type RawMessage = {
  id: string;
  jobId: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationLabel: string | null;
  locationKind: string | null;
  systemEvent: string | null;
  createdAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
  sender?: unknown;
};

export async function loadJobCtx(jobId: string): Promise<JobCtx | null> {
  return prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      hirerId: true,
      status: true,
      latitude: true,
      longitude: true,
      address: true,
      assignments: { select: { workerId: true } },
    },
  });
}

/**
 * Turns a stored message into what ONE specific viewer is allowed to see.
 * This is where chat respects the job-location lifecycle and message deletion —
 * every message that leaves the server (REST or socket) goes through here.
 */
export function serializeMessage(m: RawMessage, job: JobCtx, viewer: Viewer) {
  const base = {
    id: m.id,
    jobId: m.jobId,
    senderId: m.senderId,
    sender: m.sender,
    systemEvent: m.systemEvent,
    createdAt: m.createdAt,
    readAt: m.readAt,
    deletedAt: m.deletedAt,
  };

  if (m.deletedAt) {
    return { ...base, body: "", imageUrl: null, latitude: null, longitude: null, locationLabel: null, locationKind: null, locationExpired: false };
  }

  let latitude: number | null = null;
  let longitude: number | null = null;
  let locationLabel: string | null = null;
  let locationExpired = false;
  const hasPin = m.locationKind === "JOB_SITE" || m.latitude != null;

  if (hasPin) {
    if (m.locationKind === "JOB_SITE") {
      // Resolved live from the job: no copy of the address lives on the message.
      if (canSeePreciseLocation(job, viewer)) {
        latitude = job.latitude;
        longitude = job.longitude;
        locationLabel = job.address || `Job site · ${job.title}`;
      } else {
        locationExpired = true;
      }
    } else if (isJobEnded(job.status)) {
      // Personal / legacy pins stop being served once the job is over.
      locationExpired = true;
    } else {
      latitude = m.latitude;
      longitude = m.longitude;
      locationLabel = m.locationLabel;
    }
  }

  return {
    ...base,
    body: m.body,
    imageUrl: m.imageUrl,
    latitude,
    longitude,
    locationLabel,
    locationKind: hasPin ? m.locationKind ?? "PERSONAL" : null,
    locationExpired,
  };
}

/** Wipes coordinates stored on a job's chat messages (called when a job ends). */
export async function purgeMessageLocations(jobId: string) {
  await prisma.message.updateMany({
    where: { jobId, latitude: { not: null } },
    data: { latitude: null, longitude: null, locationLabel: null },
  });
}

/** Best-effort removal of an uploaded chat photo from disk. */
export function removeUploadedFile(url?: string | null) {
  if (!url) return;
  const marker = "/uploads/";
  const i = url.indexOf(marker);
  if (i === -1) return;
  const file = path.resolve(process.env.UPLOAD_DIR || "./uploads", path.basename(url.slice(i + marker.length)));
  fs.unlink(file, () => {});
}
