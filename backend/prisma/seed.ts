import "dotenv/config";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

// Generates a strong, URL-safe random password (no ambiguous chars needed —
// it's meant to be copy-pasted once and then rotated).
function randomPassword(length = 20): string {
  return crypto
    .randomBytes(length)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, length);
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@idle.app";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== "SUPERADMIN") {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "SUPERADMIN" } });
      console.log(`Existing user ${email} promoted to SUPERADMIN.`);
    } else {
      console.log(`SUPERADMIN ${email} already exists — no changes made.`);
    }
    return;
  }

  // Use ADMIN_PASSWORD from the environment if you want a specific value,
  // otherwise a random one is generated and printed ONCE below. Copy it
  // somewhere safe (e.g. a password manager) — it is not stored anywhere
  // and this script will not print it again.
  const plainPassword = process.env.ADMIN_PASSWORD || randomPassword();
  const passwordHash = await hashPassword(plainPassword);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: "Admin",
      lastName: "Account",
      role: "SUPERADMIN",
      accountStatus: "ACTIVE",
      acceptedTermsAt: new Date(),
      acceptedTermsVersion: "seed",
      acceptedPrivacyAt: new Date(),
      acceptedWaiverAt: new Date(),
    },
  });

  console.log("─────────────────────────────────────────────");
  console.log(" SUPERADMIN account created");
  console.log(` Email:    ${email}`);
  console.log(` Password: ${plainPassword}`);
  console.log(" Save this now — it will not be shown again.");
  console.log(" Change ADMIN_EMAIL/ADMIN_PASSWORD in .env to control these next time.");
  console.log("─────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
