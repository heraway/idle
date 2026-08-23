import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

const CURRENT_TERMS_VERSION = "2026-08-22";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  // Explicit, logged consent — cannot register without agreeing.
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service and Privacy Policy to create an account" }),
  }),
});

authRouter.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        acceptedTermsAt: new Date(),
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
        acceptedPrivacyAt: new Date(),
      },
    });

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({ token, user: sanitizeUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new ApiError(401, "Invalid email or password");

    if (user.accountStatus === "BANNED") throw new ApiError(403, "This account has been banned");
    if (user.accountStatus === "SUSPENDED") throw new ApiError(403, "This account is suspended");

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) throw new ApiError(401, "Invalid email or password");

    const token = signToken({ userId: user.id, role: user.role });
    res.json({ token, user: sanitizeUser(user) });
  })
);

// Never leak passwordHash or raw verification refs to clients.
export function sanitizeUser(user: any) {
  const { passwordHash, verificationRef, ...safe } = user;
  return safe;
}
