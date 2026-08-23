/**
 * ESCROW SERVICE
 * -------------------------------------------------------------
 * Ships as a MOCK implementation so the whole app runs end-to-end
 * for $0, with no payment processor account required. It models the
 * exact state machine a real integration needs, so swapping in a
 * real provider later is a matter of filling in the three TODOs below
 * — no schema or route changes required.
 *
 * RECOMMENDED PRODUCTION PATH: Stripe Connect
 *   1. fundEscrow()  -> create a PaymentIntent on the hirer's card,
 *      capture immediately, hold funds on your platform balance
 *      (or use manual capture + capture on release for true escrow).
 *   2. releaseEscrow() -> create a Transfer to the worker's connected
 *      account for (amount - platformFeePct).
 *   3. refundEscrow() -> Stripe refund back to the hirer.
 *   Always do this from a webhook-verified, idempotent server flow —
 *   never trust the client to tell you a payment succeeded.
 * -------------------------------------------------------------
 */
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function fundEscrow(jobId: string, amount: number) {
  const existing = await prisma.escrow.findUnique({ where: { jobId } });
  if (existing && existing.status === "FUNDED") {
    throw new ApiError(400, "Escrow already funded for this job");
  }

  // TODO(production): create + capture a real PaymentIntent here and
  // store its id as providerRef instead of a mock string.
  const mockProviderRef = `mock_pi_${Date.now()}`;

  return prisma.escrow.upsert({
    where: { jobId },
    update: { amount, status: "FUNDED", providerRef: mockProviderRef, fundedAt: new Date() },
    create: { jobId, amount, status: "FUNDED", providerRef: mockProviderRef, fundedAt: new Date() },
  });
}

export async function releaseEscrow(jobId: string) {
  const escrow = await prisma.escrow.findUnique({ where: { jobId } });
  if (!escrow) throw new ApiError(404, "No escrow found for this job");
  if (escrow.status !== "FUNDED") throw new ApiError(400, `Cannot release escrow in status ${escrow.status}`);

  // TODO(production): Transfer (amount * (1 - platformFeePct/100)) to the
  // worker's connected payout account via your payment provider.

  return prisma.escrow.update({
    where: { jobId },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
}

export async function refundEscrow(jobId: string) {
  const escrow = await prisma.escrow.findUnique({ where: { jobId } });
  if (!escrow) throw new ApiError(404, "No escrow found for this job");
  if (escrow.status !== "FUNDED" && escrow.status !== "DISPUTED_HOLD") {
    throw new ApiError(400, `Cannot refund escrow in status ${escrow.status}`);
  }

  // TODO(production): issue a real refund via your payment provider.

  return prisma.escrow.update({
    where: { jobId },
    data: { status: "REFUNDED", refundedAt: new Date() },
  });
}

export async function freezeEscrowForDispute(jobId: string) {
  return prisma.escrow.update({
    where: { jobId },
    data: { status: "DISPUTED_HOLD" },
  });
}
