import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { createVerificationSession, mockCompleteVerification } from "../services/idVerification.service";

export const verificationRouter = Router();

// ------------------------------------------------------------
// START — a worker who wants to bid on jobs that require ID verification
// starts a session here. In production this returns a hosted-flow URL from
// Stripe Identity/Persona that the mobile app opens; the ID image never
// touches our own servers (see idVerification.service.ts for the full
// rationale). The user must explicitly consent before this can be called —
// enforced by requiring an accepted consent record first.
// ------------------------------------------------------------
const consentSchema = z.object({
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "You must consent to ID verification before starting the process" }),
  }),
});

verificationRouter.post(
  "/start",
  requireAuth,
  asyncHandler(async (req, res) => {
    consentSchema.parse(req.body);
    const session = await createVerificationSession(req.auth!.userId);
    res.json(session);
  })
);

verificationRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.auth!.userId },
      select: { verificationStatus: true, verifiedAt: true },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.json(user);
  })
);

// ------------------------------------------------------------
// DEV-ONLY: simulates the provider webhook completing verification, since
// there's no real provider wired up yet. Remove/disable this route before
// going to production — real completion should only ever come from
// handleProviderWebhook() in idVerification.service.ts, called from a
// signature-verified webhook endpoint.
// ------------------------------------------------------------
if (process.env.NODE_ENV !== "production") {
  const mockSchema = z.object({ approve: z.boolean() });
  verificationRouter.post(
    "/mock-complete",
    requireAuth,
    asyncHandler(async (req, res) => {
      const data = mockSchema.parse(req.body);
      const user = await mockCompleteVerification(req.auth!.userId, data.approve);
      res.json({ verificationStatus: user.verificationStatus });
    })
  );
}
