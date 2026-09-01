import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { authLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { sendPasswordResetEmail } from "../services/email.service";

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
        acceptedWaiverAt: new Date(),
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

// ------------------------------------------------------------
// FORGOT PASSWORD — always responds the same way whether or not the email
// exists, so an attacker can't use this endpoint to discover which emails
// are registered. The raw token is only ever sent via email; the database
// stores just a hash of it (same principle as password storage) so a DB
// leak alone can't be used to reset accounts.
// ------------------------------------------------------------
const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post(
  "/forgot-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt },
      });

      await sendPasswordResetEmail(user.email, rawToken);
    }

    // Same response either way — prevents email enumeration.
    res.json({ message: "If an account exists for that email, a reset code has been sent." });
  })
);

// ------------------------------------------------------------
// RESET PASSWORD — consumes the token from the email. Single-use: the
// stored hash is cleared immediately after a successful reset.
// ------------------------------------------------------------
const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post(
  "/reset-password",
  authLimiter,
  asyncHandler(async (req, res) => {
    const data = resetPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      throw new ApiError(400, "Invalid or expired reset code");
    }
    if (user.passwordResetExpiresAt < new Date()) {
      throw new ApiError(400, "This reset code has expired. Please request a new one.");
    }

    const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");
    if (tokenHash !== user.passwordResetTokenHash) {
      throw new ApiError(400, "Invalid or expired reset code");
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });

    res.json({ message: "Password reset successfully. You can now log in with your new password." });
  })
);

// ------------------------------------------------------------
// CHANGE PASSWORD — for a logged-in user who knows their current password
// (distinct from forgot-password, which is for when they don't). Requires
// the current password as a safeguard in case a device/session is
// compromised or left logged in.
// ------------------------------------------------------------
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post(
  "/change-password",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = changePasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } });
    if (!user) throw new ApiError(404, "User not found");

    const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!ok) throw new ApiError(401, "Current password is incorrect");

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    res.json({ message: "Password changed successfully." });
  })
);

// Never leak passwordHash or raw verification refs to clients.
export function sanitizeUser(user: any) {
  const { passwordHash, verificationRef, passwordResetTokenHash, ...safe } = user;
  return safe;
}
