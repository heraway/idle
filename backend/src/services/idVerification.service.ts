/**
 * ID VERIFICATION SERVICE
 * -------------------------------------------------------------
 * Used ONLY when a hirer sets `requiresIdVerification: true` on a job
 * (e.g. driving jobs, in-home jobs, jobs involving children). Workers
 * who want to bid on such jobs must first complete ID verification once;
 * the result (User.verificationStatus) is reused for future jobs.
 *
 * PRIVACY-BY-DESIGN RULE: this platform's own database NEVER stores raw
 * government ID images or numbers — only a status and an opaque provider
 * reference id (see prisma/schema.prisma -> User.verificationStatus /
 * verificationRef). In production the document should be uploaded directly
 * to the verification provider client-side (their SDK/hosted flow) so it
 * never transits our servers at all. Ships here as a MOCK provider so the
 * app runs for $0.
 *
 * PRODUCTION PATH: Stripe Identity or Persona.
 *   1. createVerificationSession() -> call the provider, return a
 *      client_secret / hosted session url to the mobile app.
 *   2. Mobile app opens the provider's hosted capture flow directly.
 *   3. Provider calls YOUR webhook with a verified/rejected event ->
 *      handleProviderWebhook() updates User.verificationStatus.
 * -------------------------------------------------------------
 */
import { prisma } from "../config/prisma";

export async function createVerificationSession(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { verificationStatus: "PENDING", verificationRef: `mock_verif_${Date.now()}` },
  });

  // TODO(production): return a real session URL from Stripe Identity / Persona.
  return {
    sessionUrl: "https://mock-id-verification.example/session/demo",
    provider: "mock",
    note: "In production this opens a hosted, PCI/PII-safe capture flow — no ID image ever touches our servers.",
  };
}

/** Simulates the provider's async webhook for local dev/demo purposes. */
export async function mockCompleteVerification(userId: string, approve: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      verificationStatus: approve ? "VERIFIED" : "REJECTED",
      verifiedAt: approve ? new Date() : null,
    },
  });
}

/** Real handler shape for when a production provider webhook is wired up. */
export async function handleProviderWebhook(payload: { userId: string; status: "VERIFIED" | "REJECTED" }) {
  return prisma.user.update({
    where: { id: payload.userId },
    data: {
      verificationStatus: payload.status,
      verifiedAt: payload.status === "VERIFIED" ? new Date() : null,
    },
  });
}

export async function getVerificationStatus(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true, verifiedAt: true },
  });
}
