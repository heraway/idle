/**
 * ID VERIFICATION SERVICE
 * -------------------------------------------------------------
 * Used ONLY when a hirer sets `requiresIdVerification: true` on a job
 * (e.g. driving jobs, in-home jobs, jobs involving children). Workers
 * who want to bid on such jobs must first complete ID verification once;
 * the result is reused for future jobs (see the IdVerification model).
 *
 * PRIVACY-BY-DESIGN RULE: this platform's own database NEVER stores raw
 * government ID images or numbers — only a status, a provider name, and
 * an opaque provider reference id (see prisma/schema.prisma -> IdVerification).
 * In production the document should be uploaded directly to the verification
 * provider client-side (their SDK/hosted flow) so it never transits our
 * servers at all. Ships here as a MOCK provider so the app runs for $0.
 *
 * PRODUCTION PATH: Stripe Identity or Persona.
 *   1. startVerification() -> call the provider, return a client_secret /
 *      hosted session url to the mobile app.
 *   2. Mobile app opens the provider's hosted capture flow directly.
 *   3. Provider calls YOUR webhook with a verified/failed event ->
 *      handleProviderWebhook() updates IdVerification + User.idVerificationStatus.
 * -------------------------------------------------------------
 */
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const PROVIDER = process.env.ID_VERIFICATION_PROVIDER || "mock";

export async function startVerification(userId: string) {
  const providerRef = `mock_idv_${Date.now()}`;

  const record = await prisma.idVerification.upsert({
    where: { userId },
    update: { provider: PROVIDER, providerRef, status: "PENDING" },
    create: { userId, provider: PROVIDER, providerRef, status: "PENDING" },
  });

  await prisma.user.update({ where: { id: userId }, data: { idVerificationStatus: "PENDING" } });

  // TODO(production): return a real session URL from Stripe Identity / Persona
  // instead of this placeholder.
  return {
    ...record,
    sessionUrl: "https://mock-id-verification.example/session/demo",
    note: "Production build opens a hosted, PCI/PII-safe capture flow — no ID image ever touches our servers.",
  };
}

/** Simulates the provider's async webhook for local dev/demo purposes. */
export async function mockCompleteVerification(userId: string, approve: boolean) {
  const existing = await prisma.idVerification.findUnique({ where: { userId } });
  if (!existing) throw new ApiError(404, "No verification session started for this user");

  const status = approve ? "VERIFIED" : "FAILED";
  const now = new Date();
  const expiresAt = approve ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()) : null;

  await prisma.idVerification.update({
    where: { userId },
    data: { status, verifiedAt: approve ? now : null, expiresAt },
  });

  return prisma.user.update({ where: { id: userId }, data: { idVerificationStatus: status } });
}

/** Real handler shape for when a production provider webhook is wired up. */
export async function handleProviderWebhook(payload: { userId: string; status: "VERIFIED" | "FAILED" }) {
  await prisma.idVerification.update({
    where: { userId: payload.userId },
    data: { status: payload.status, verifiedAt: payload.status === "VERIFIED" ? new Date() : null },
  });
  return prisma.user.update({
    where: { id: payload.userId },
    data: { idVerificationStatus: payload.status },
  });
}

export async function getVerificationStatus(userId: string) {
  return prisma.idVerification.findUnique({ where: { userId } });
}
