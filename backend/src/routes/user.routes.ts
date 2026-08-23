import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { sanitizeUser } from "./auth.routes";
import { ApiError } from "../utils/ApiError";

export const userRouter = Router();

userRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new ApiError(404, "User not found");
    res.json(sanitizeUser(user));
  })
);

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  hoursPerDayAvailable: z.number().int().min(1).max(24).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

userRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.update({ where: { id: req.auth!.userId }, data });
    res.json(sanitizeUser(user));
  })
);

// Public-safe profile view — used when viewing another user's trust profile
// (ratings, likes, verification badge) before accepting a bid or job.
userRouter.get(
  "/:id/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        city: true,
        country: true,
        avgRating: true,
        ratingCount: true,
        likesReceived: true,
        verificationStatus: true,
        hoursPerDayAvailable: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  })
);
