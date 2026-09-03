import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "SUPERADMIN",
      accountStatus: "ACTIVE",
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    },
    create: {
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

  console.log("-----------------------------------------------");
  console.log(` Account ready: ${user.email}`);
  console.log(` Role:          ${user.role}`);
  console.log(` Status:        ${user.accountStatus}`);
  console.log(" Password has been set to the value you provided in ADMIN_PASSWORD.");
  console.log("-----------------------------------------------");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
