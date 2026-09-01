import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";

export const jobRouter = Router();

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------
const createJobSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(3000),
  category: z.string().min(2),
  requiresLicense: z.string().optional(),
  requiresIdVerification: z.boolean().optional().default(false),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  payType: z.enum(["fixed", "hourly"]),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  currency: z.string().default("USD"),
  durationEstimate: z.string().optional(),
  workersNeeded: z.number().int().min(1).max(50).default(1),
  hoursPerDayNeeded: z.number().int().min(1).max(24).optional(),
  checklist: z.array(z.string().min(1)).optional(), // initial task list, ticked off during the job
});

jobRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = createJobSchema.parse(req.body);

    const job = await prisma.job.create({
      data: {
        hirerId: req.auth!.userId,
        title: data.title,
        description: data.description,
        category: data.category,
        requiresLicense: data.requiresLicense,
        requiresIdVerification: data.requiresIdVerification,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        city: data.city,
        country: data.country,
        payType: data.payType,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        currency: data.currency,
        durationEstimate: data.durationEstimate,
        workersNeeded: data.workersNeeded,
        hoursPerDayNeeded: data.hoursPerDayNeeded,
        checklistItems: data.checklist
          ? { create: data.checklist.map((label, i) => ({ label, order: i })) }
          : undefined,
      },
      include: { checklistItems: true },
    });

    res.status(201).json(job);
  })
);

// ------------------------------------------------------------
// SEARCH / LIST — location, pay rate, duration, workers needed, category
// ------------------------------------------------------------
const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(), // free-text search across title/description
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().optional().default(25),
  minPay: z.coerce.number().optional(),
  maxPay: z.coerce.number().optional(),
  payType: z.enum(["fixed", "hourly"]).optional(),
  minWorkers: z.coerce.number().optional(),
  maxWorkers: z.coerce.number().optional(),
  durationContains: z.string().optional(), // e.g. "1 day", "2-3 hours"
  status: z.string().optional().default("OPEN"),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
});

// Haversine distance in km — good enough for a portfolio project;
// swap for PostGIS ST_DWithin at scale.
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ------------------------------------------------------------
// LOCATION PRIVACY — a job's exact coordinates and street address are only
// shown to the hirer, the assigned worker, and admins. Everyone else
// (people browsing the feed, or who bid but weren't chosen) sees the
// location rounded to ~1.1km precision and no street address — enough to
// judge distance/neighborhood without pinpointing a home. Full precision
// reappears automatically once a worker is assigned, since they need it to
// actually show up. Note this only closes the "browsing/rejected bidder"
// exposure — it can't retroactively hide an address from a worker who
// physically visited; that's a real-world limit no API-side masking fixes,
// which is why report.routes.ts + admin escalation exist as the backstop
// for a completed job that ends up unsafe.
// ------------------------------------------------------------
function maskJobLocation<T extends { hirerId: string; workerId?: string | null; latitude: number; longitude: number; address?: string | null }>(
  job: T,
  viewer?: { userId: string; role: string }
): T {
  const isParticipant = !!viewer && (viewer.userId === job.hirerId || viewer.userId === job.workerId);
  const isAdmin = !!viewer && (viewer.role === "ADMIN" || viewer.role === "SUPERADMIN");
  if (isParticipant || isAdmin) return job;

  return {
    ...job,
    latitude: Math.round(job.latitude * 100) / 100,
    longitude: Math.round(job.longitude * 100) / 100,
    address: null,
  };
}
jobRouter.get(
  "/search",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = searchSchema.parse(req.query);

    const where: any = { status: q.status };
    if (q.category) where.category = { equals: q.category, mode: "insensitive" };
    if (q.payType) where.payType = q.payType;
    if (q.minWorkers) where.workersNeeded = { gte: q.minWorkers };
    if (q.maxWorkers) where.workersNeeded = { ...(where.workersNeeded || {}), lte: q.maxWorkers };
    if (q.durationContains) where.durationEstimate = { contains: q.durationContains, mode: "insensitive" };
    if (q.minPay || q.maxPay) {
      where.AND = [
        ...(q.minPay ? [{ OR: [{ budgetMax: { gte: q.minPay } }, { budgetMin: { gte: q.minPay } }] }] : []),
        ...(q.maxPay ? [{ OR: [{ budgetMin: { lte: q.maxPay } }, { budgetMax: { lte: q.maxPay } }] }] : []),
      ];
    }
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
      ];
    }

    let jobs = await prisma.job.findMany({
      where,
      include: { hirer: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true } }, _count: { select: { bids: true } } },
      orderBy: { createdAt: "desc" },
      take: q.lat && q.lng ? undefined : q.pageSize, // if geo-filtering, paginate after distance filter
      skip: q.lat && q.lng ? undefined : (q.page - 1) * q.pageSize,
    });

    if (q.lat !== undefined && q.lng !== undefined) {
      const withDistance = jobs.map((j: (typeof jobs)[number]) => ({
        ...j,
        distanceKm: distanceKm(q.lat!, q.lng!, j.latitude, j.longitude),
      }));
      jobs = withDistance
        .filter((j: (typeof withDistance)[number]) => j.distanceKm <= q.radiusKm)
        .sort((a: (typeof withDistance)[number], b: (typeof withDistance)[number]) => a.distanceKm - b.distanceKm)
        .slice((q.page - 1) * q.pageSize, q.page * q.pageSize) as typeof jobs;
    }

    const maskedJobs = jobs.map((j: (typeof jobs)[number]) => maskJobLocation(j, req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined));

    res.json({ jobs: maskedJobs, page: q.page, pageSize: q.pageSize });
  })
);

// ------------------------------------------------------------
// GET ONE
// ------------------------------------------------------------
jobRouter.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        hirer: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true, verificationStatus: true } },
        worker: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true, verificationStatus: true } },
        checklistItems: { orderBy: { order: "asc" } },
        bids: { include: { bidder: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true, verificationStatus: true } } } },
        escrow: true,
      },
    });
    if (!job) throw new ApiError(404, "Job not found");

    const masked = maskJobLocation(job, req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined);
    res.json(masked);
  })
);

// ------------------------------------------------------------
// BEFORE / AFTER PROOF PHOTOS
// ------------------------------------------------------------
jobRouter.post(
  "/:id/before-photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can upload the before photo");
    if (!req.file) throw new ApiError(400, "No photo uploaded");

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { beforePhotoUrl: publicUrlFor(req.file.filename) },
    });
    res.json(updated);
  })
);

jobRouter.post(
  "/:id/after-photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can upload the after photo");
    if (!req.file) throw new ApiError(400, "No photo uploaded");

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { afterPhotoUrl: publicUrlFor(req.file.filename) },
    });
    res.json(updated);
  })
);

// ------------------------------------------------------------
// CANCEL (by hirer, before assignment) — admin cancel lives in admin.routes.ts
// ------------------------------------------------------------
jobRouter.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can cancel this job");
    if (!["OPEN", "ASSIGNED"].includes(job.status)) throw new ApiError(400, `Cannot cancel a job in status ${job.status}`);

    const updated = await prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
    res.json(updated);
  })
);
