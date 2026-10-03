import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, optionalAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { upload, publicUrlFor } from "../services/upload.service";
import { assertClean } from "../utils/profanityFilter";
import { refundEscrow } from "../services/escrow.service";
import { notifyJobCancelled } from "../services/notification.service";
import { BidStatus } from "@prisma/client";

export const jobRouter = Router();

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------
const createJobSchema = z
  .object({
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
    budgetMin: z.number().positive("Enter a pay amount greater than 0"),
    budgetMax: z.number().positive().optional(),
    currency: z.string().default("USD"),
    durationEstimate: z.string().optional(),
    workersNeeded: z.number().int().min(1).max(50).default(1),
    hoursPerDayNeeded: z.number().int().min(1).max(24).optional(),
    checklist: z.array(z.string().min(1)).optional(), // initial task list, ticked off during the job
  })
  .refine((data) => data.budgetMax === undefined || data.budgetMax >= data.budgetMin, {
    message: "Budget max must be greater than or equal to budget min",
    path: ["budgetMax"],
  });

const DEFAULT_JOB_LIFETIME_DAYS = 30;

jobRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = createJobSchema.parse(req.body);
    assertClean(data.title, "job title");
    assertClean(data.description, "job description");

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
        expiresAt: new Date(Date.now() + DEFAULT_JOB_LIFETIME_DAYS * 24 * 60 * 60 * 1000),
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
  payType: z.enum(["fixed", "hourly"]).optional(),
  minWorkers: z.coerce.number().optional(),
  maxWorkers: z.coerce.number().optional(),
  durationContains: z.string().optional(), // e.g. "1 day", "2-3 hours"
  sort: z.enum(["newest", "pay_high", "pay_low", "nearest", "ending_soon"]).optional().default("newest"),
  hasPhotos: z.enum(["true", "false", "1", "0"]).optional().transform((v) => v === "true" || v === "1"),
  noIdRequired: z.enum(["true", "false", "1", "0"]).optional().transform((v) => v === "true" || v === "1"), // hide jobs that demand ID verification
  verifiedOnly: z.enum(["true", "false", "1", "0"]).optional().transform((v) => v === "true" || v === "1"), // only jobs that require ID verification
  minRating: z.coerce.number().min(0).max(5).optional(), // hirer's average rating
  postedWithinHours: z.coerce.number().positive().optional(),
  postedAfter: z.coerce.date().optional(), // ISO timestamp — only jobs posted at/after this moment
  endingWithinHours: z.coerce.number().positive().optional(),
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
// judge distance/neighborhood without pinpointing a home.
// ------------------------------------------------------------
function maskJobLocation<T extends { hirerId: string; assignments?: { workerId: string }[]; latitude: number; longitude: number; address?: string | null }>(
  job: T,
  viewer?: { userId: string; role: string }
): T {
  const isParticipant = !!viewer && (viewer.userId === job.hirerId || job.assignments?.some((assignment) => assignment.workerId === viewer.userId));
  const isAdmin = !!viewer && (viewer.role === "ADMIN" || viewer.role === "SUPERADMIN");
  if (isParticipant || isAdmin) return job;

  return {
    ...job,
    latitude: approxCoord(job.latitude),
    longitude: approxCoord(job.longitude),
    address: null,
  };
}

type JobSearchQuery = z.infer<typeof searchSchema>;

// ------------------------------------------------------------
// APPLICANT COUNTS — always derived from the Bid table, never stored or
// guessed. A withdrawn bid no longer counts; pending/accepted/rejected do.
// Only the number is ever exposed to the public, never who applied.
// ------------------------------------------------------------
const APPLICANT_COUNT_SELECT = { bids: { where: { status: { not: BidStatus.WITHDRAWN } } } };

function withApplicantCount<T extends { _count?: { bids: number } }>(job: T) {
  const { _count, ...rest } = job;
  return { ...rest, applicantCount: _count?.bids ?? 0 };
}

// ~1.1km grid. Deterministic, so the same job always lands on the same
// approximate spot and the true coordinates can't be recovered from it.
function approxCoord(n: number) {
  return Math.round(n * 100) / 100;
}

// Shared by the list feed and the map so both honour exactly the same filters.
function buildJobWhere(q: JobSearchQuery) {
  const where: any = q.status === "OPEN" ? { status: q.status, expiresAt: { gt: new Date() } } : { status: q.status };
  if (q.category) where.category = { equals: q.category, mode: "insensitive" };
  if (q.payType) where.payType = q.payType;
  if (q.minWorkers) where.workersNeeded = { gte: q.minWorkers };
  if (q.maxWorkers) where.workersNeeded = { ...(where.workersNeeded || {}), lte: q.maxWorkers };
  if (q.durationContains) where.durationEstimate = { contains: q.durationContains, mode: "insensitive" };
  if (q.minPay) {
    where.AND = [{ OR: [{ budgetMax: { gte: q.minPay } }, { budgetMin: { gte: q.minPay } }] }];
  }
  if (q.q) {
    where.OR = [
      { title: { contains: q.q, mode: "insensitive" } },
      { description: { contains: q.q, mode: "insensitive" } },
    ];
  }
  if (q.hasPhotos) where.previewPhotoUrls = { isEmpty: false };
  if (q.noIdRequired) where.requiresIdVerification = false;
  if (q.verifiedOnly) where.requiresIdVerification = true;
  // Rating = the poster's average rating, "N stars and up".
  if (q.minRating) where.hirer = { avgRating: { gte: q.minRating } };

  // Posted-time window: the tightest of whatever was supplied wins.
  const postedSince: number[] = [];
  if (q.postedAfter) postedSince.push(q.postedAfter.getTime());
  if (q.postedWithinHours) postedSince.push(Date.now() - q.postedWithinHours * 3600 * 1000);
  if (postedSince.length > 0) where.createdAt = { gte: new Date(Math.max(...postedSince)) };

  if (q.endingWithinHours && q.status === "OPEN") {
    where.expiresAt = { gt: new Date(), lte: new Date(Date.now() + q.endingWithinHours * 3600 * 1000) };
  }
  return where;
}

jobRouter.get(
  "/search",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = searchSchema.parse(req.query);

    const where = buildJobWhere(q);

    const orderBy: any =
      q.sort === "pay_high" ? [{ budgetMax: { sort: "desc", nulls: "last" } }, { budgetMin: "desc" }]
      : q.sort === "pay_low" ? [{ budgetMin: { sort: "asc", nulls: "last" } }]
      : q.sort === "ending_soon" ? { expiresAt: "asc" }
      : { createdAt: "desc" };

    const totalCount = await prisma.job.count({ where });

    const rows = await prisma.job.findMany({
      where,
      include: {
        hirer: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true } },
        assignments: { select: { workerId: true } },
        _count: { select: APPLICANT_COUNT_SELECT },
      },
      orderBy,
      take: q.lat && q.lng ? undefined : q.pageSize, // if geo-filtering, paginate after distance filter
      skip: q.lat && q.lng ? undefined : (q.page - 1) * q.pageSize,
    });

    // Mask first, then derive everything else from the masked job. That way
    // the distance we return (and filter on) can't be used to triangulate the
    // exact address from a few different vantage points.
    const viewer = req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined;
    let jobs = rows.map((j) => withApplicantCount(maskJobLocation(j, viewer)));

    if (q.lat !== undefined && q.lng !== undefined) {
      const withDistance = jobs.map((j) => ({
        ...j,
        distanceKm: Math.round(distanceKm(q.lat!, q.lng!, j.latitude, j.longitude) * 10) / 10,
      }));
      jobs = withDistance
        .filter((j) => j.distanceKm <= q.radiusKm)
        // Keep the DB ordering unless the user asked for "nearest" (or didn't pick a sort).
        .sort((a, b) => (q.sort === "nearest" ? a.distanceKm - b.distanceKm : 0))
        .slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    }

    res.json({
      jobs,
      total: totalCount,
      page: q.page,
      pageSize: q.pageSize,
      totalPages: Math.ceil(totalCount / q.pageSize),
    });
  })
);

// ------------------------------------------------------------
// MAP DISCOVERY — every available job, at approximate locations only.
// Separate from /search so the map isn't limited to one page of list results.
// The street address, exact coordinates, hirer identity and applicant
// identities are never part of this payload, for anyone (the poster included —
// exact locations only live on the job detail screen, for participants).
// ------------------------------------------------------------
const MAP_MAX_JOBS = 500;

jobRouter.get(
  "/map",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const q = searchSchema.parse(req.query);
    // Discovery only shows jobs that are still open and taking bids.
    const where = buildJobWhere({ ...q, status: "OPEN" });

    const rows = await prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        payType: true,
        budgetMin: true,
        budgetMax: true,
        currency: true,
        city: true,
        createdAt: true,
        expiresAt: true,
        latitude: true,
        longitude: true,
        _count: { select: APPLICANT_COUNT_SELECT },
      },
      orderBy: { createdAt: "desc" },
      take: MAP_MAX_JOBS,
    });

    const jobs = rows.map(({ _count, latitude, longitude, ...job }) => ({
      ...job,
      latitude: approxCoord(latitude),
      longitude: approxCoord(longitude),
      applicantCount: _count.bids,
    }));

    res.json({ jobs, total: jobs.length, truncated: jobs.length === MAP_MAX_JOBS });
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
        assignments: { include: { worker: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true, verificationStatus: true } } } },
        checklistItems: { orderBy: { order: "asc" } },
        bids: { include: { bidder: { select: { id: true, firstName: true, lastName: true, avgRating: true, avatarUrl: true, verificationStatus: true } } } },
        questions: {
          orderBy: { createdAt: "asc" },
          include: { asker: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
        escrow: true,
      },
    });
    if (!job) throw new ApiError(404, "Job not found");

    const expiresAt = (job as { expiresAt?: Date | null }).expiresAt;
    if (job.status === "OPEN" && expiresAt && new Date(expiresAt) <= new Date()) {
      const expired = await prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
      return res.json(maskJobLocation(expired, req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined));
    }

    const viewer = req.auth ? { userId: req.auth.userId, role: req.auth.role } : undefined;
    const masked = maskJobLocation(job, viewer);

    // Applicant identities are private to the poster (and admins). Everyone
    // else gets the headline count and, if they've bid, only their own bid.
    const isAdmin = !!viewer && (viewer.role === "ADMIN" || viewer.role === "SUPERADMIN");
    const canSeeAllBids = !!viewer && (viewer.userId === job.hirerId || isAdmin);
    const visibleBids = canSeeAllBids ? job.bids : job.bids.filter((b) => !!viewer && b.bidderId === viewer.userId);

    res.json({
      ...masked,
      bids: visibleBids,
      applicantCount: job.bids.filter((b) => b.status !== "WITHDRAWN").length,
    });
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
      data: { beforePhotoUrl: publicUrlFor(req.file.filename, req) },
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
      data: { afterPhotoUrl: publicUrlFor(req.file.filename, req) },
    });
    res.json(updated);
  })
);

// ------------------------------------------------------------
// PREVIEW PHOTOS — optional photos of the work site
// ------------------------------------------------------------
const MAX_PREVIEW_PHOTOS = 5;

jobRouter.post(
  "/:id/preview-photos",
  requireAuth,
  upload.array("photos", MAX_PREVIEW_PHOTOS),
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can add preview photos");
    if (job.status !== "OPEN") throw new ApiError(400, "Preview photos can only be added while the job is open for bids");

    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) throw new ApiError(400, "No photos uploaded");
    if (job.previewPhotoUrls.length + files.length > MAX_PREVIEW_PHOTOS) {
      throw new ApiError(400, `A job can have at most ${MAX_PREVIEW_PHOTOS} preview photos (${job.previewPhotoUrls.length} already added)`);
    }

    const newUrls = files.map((f) => publicUrlFor(f.filename, req));
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { previewPhotoUrls: { push: newUrls } },
    });

    res.status(201).json(updated);
  })
);

jobRouter.delete(
  "/:id/preview-photos",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can remove preview photos");

    const urlToRemove = req.body?.url as string | undefined;
    if (!urlToRemove) throw new ApiError(400, "url is required");

    const updated = await prisma.job.update({
      where: { id: job.id },
      data: { previewPhotoUrls: job.previewPhotoUrls.filter((u: string) => u !== urlToRemove) },
    });
    res.json(updated);
  })
);

// ------------------------------------------------------------
// CANCEL (by hirer, before assignment)
// ------------------------------------------------------------
jobRouter.post(
  "/:id/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { escrow: true, assignments: { include: { worker: { select: { id: true } } } } },
    });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.hirerId !== req.auth!.userId) throw new ApiError(403, "Only the hirer can cancel this job");
    if (!["OPEN", "ASSIGNED"].includes(job.status)) throw new ApiError(400, `Cannot cancel a job in status ${job.status}`);

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } });
      // Any bids still waiting on a decision are now moot — close them out
      // rather than leaving them PENDING forever.
      await tx.bid.updateMany({ where: { jobId: job.id, status: "PENDING" }, data: { status: "REJECTED" } });
      return cancelled;
    });

    // Escrow is only ever funded once a job reaches ASSIGNED (see
    // escrow.routes.ts), but a hirer can still cancel from ASSIGNED before
    // work starts — refund it the same way the admin force-cancel path
    // already does, so money never gets stuck in FUNDED with no job left.
    if (job.escrow && (job.escrow.status === "FUNDED" || job.escrow.status === "DISPUTED_HOLD")) {
      await refundEscrow(job.id);
    }

    // Let anyone already assigned know — they may have already started
    // planning around this job.
    await Promise.all(job.assignments.map((a) => notifyJobCancelled(a.worker.id, job.title)));

    res.json(updated);
  })
);