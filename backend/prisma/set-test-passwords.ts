import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

// Test/dev accounts only — never run this against emails that could be a
// real user. m.mukuka1323@gmail.com (admin) is intentionally excluded.
const TEST_EMAILS = ["test1@idle.test", "test2@idle.test", "test3@idle.test"];
const NEW_PASSWORD = "idletest0";

async function main() {
  const passwordHash = await hashPassword(NEW_PASSWORD);

  for (const email of TEST_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Skipped ${email} — no account with that email exists.`);
      continue;
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    console.log(`Password set for ${email}`);
  }

  console.log(`\nAll set. Every test account above now logs in with: ${NEW_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
