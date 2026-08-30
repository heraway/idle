import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

const TEST_PASSWORD = "TestPass123";

// A rough real-world spread across the new category list, some fixed-price,
// some hourly, one requiring ID verification, one asking for more than one
// worker (see the README note in the chat response about why that last one
// won't fully behave yet).
const JOB_SEEDS = [
  {
    title: "Deep clean 2-bed apartment",
    description: "Kitchen, bathroom, and living areas. Bring your own supplies if possible.",
    category: "Home & Cleaning",
    payType: "fixed",
    budgetMin: 40,
    budgetMax: 60,
    durationEstimate: "3-4 hours",
    workersNeeded: 1,
  },
  {
    title: "Weekly lawn mowing — ongoing",
    description: "Medium-sized yard, front and back. Looking for someone reliable weekly.",
    category: "Outdoor & Yard",
    payType: "hourly",
    budgetMin: 15,
    budgetMax: 20,
    durationEstimate: "1-2 hours",
    workersNeeded: 1,
  },
  {
    title: "After-school pickup + watch until 6pm",
    description: "Two kids, ages 7 and 10. Homework help a plus.",
    category: "Child & Pet Care",
    payType: "hourly",
    budgetMin: 12,
    budgetMax: 18,
    durationEstimate: "2 hours/day",
    workersNeeded: 1,
  },
  {
    title: "Grocery run + drop off",
    description: "List will be provided, budget for groceries covered separately.",
    category: "Errands & Delivery",
    payType: "fixed",
    budgetMin: 10,
    budgetMax: 15,
    durationEstimate: "1 hour",
    workersNeeded: 1,
  },
  {
    title: "Help moving a 2-bedroom apartment",
    description: "Furniture, boxes, one flight of stairs. Need people who can lift comfortably.",
    category: "Moving & Lifting",
    payType: "fixed",
    budgetMin: 80,
    budgetMax: 120,
    durationEstimate: "4-5 hours",
    // NOTE: intentionally >1 to exercise the multi-worker case in testing —
    // see the caveat in chat about JobAssignment currently being 1:1.
    workersNeeded: 3,
  },
  {
    title: "Assemble flat-pack wardrobe",
    description: "Standard wardrobe, instructions included, tools needed.",
    category: "Repairs & Assembly",
    payType: "fixed",
    budgetMin: 25,
    budgetMax: 35,
    durationEstimate: "1-2 hours",
    workersNeeded: 1,
  },
  {
    title: "Braids for a wedding, next Saturday",
    description: "Box braids, medium length. Reference photos available on request.",
    category: "Beauty & Personal Care",
    payType: "fixed",
    budgetMin: 30,
    budgetMax: 50,
    durationEstimate: "2-3 hours",
    workersNeeded: 1,
  },
  {
    title: "Set up new laptop + transfer files",
    description: "Windows to Windows migration, plus basic printer setup.",
    category: "Tech & Digital",
    payType: "fixed",
    budgetMin: 20,
    budgetMax: 30,
    durationEstimate: "1 hour",
    workersNeeded: 1,
  },
  {
    title: "Serve drinks at a small birthday event",
    description: "About 25 guests, 3-hour event, professional attire.",
    category: "Events & Hospitality",
    payType: "hourly",
    budgetMin: 12,
    budgetMax: 15,
    durationEstimate: "3 hours",
    requiresIdVerification: true,
    workersNeeded: 1,
  },
  {
    title: "High school math tutoring, twice a week",
    description: "Algebra 2 and geometry. Ongoing if it's a good fit.",
    category: "Tutoring & Lessons",
    payType: "hourly",
    budgetMin: 18,
    budgetMax: 25,
    durationEstimate: "1 hour/session",
    workersNeeded: 1,
  },
];

async function upsertTestUser(handle: string) {
  const email = `${handle}@idle.test`;
  const passwordHash = await hashPassword(TEST_PASSWORD);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      firstName: handle[0].toUpperCase() + handle.slice(1),
      lastName: "Tester",
      role: "USER",
      accountStatus: "ACTIVE",
      city: "Lusaka",
      country: "Zambia",
      latitude: -15.3875,
      longitude: 28.3228,
      acceptedTermsAt: new Date(),
      acceptedTermsVersion: "seed",
      acceptedPrivacyAt: new Date(),
      acceptedWaiverAt: new Date(),
    },
  });
}

async function main() {
  const [test1, test2, test3] = await Promise.all([
    upsertTestUser("test1"),
    upsertTestUser("test2"),
    upsertTestUser("test3"),
  ]);
  console.log(`Test accounts ready — all use password: ${TEST_PASSWORD}`);
  console.log(`  test1@idle.test`);
  console.log(`  test2@idle.test`);
  console.log(`  test3@idle.test`);

  // Spread job posts across the three accounts as hirer so you have jobs
  // to browse/bid on from every other account.
  const hirers = [test1, test2, test3];
  let created = 0;
  for (let i = 0; i < JOB_SEEDS.length; i++) {
    const seed = JOB_SEEDS[i];
    const hirer = hirers[i % hirers.length];
    const exists = await prisma.job.findFirst({ where: { title: seed.title, hirerId: hirer.id } });
    if (exists) continue;
    await prisma.job.create({
      data: {
        hirerId: hirer.id,
        title: seed.title,
        description: seed.description,
        category: seed.category,
        payType: seed.payType,
        budgetMin: seed.budgetMin,
        budgetMax: seed.budgetMax,
        durationEstimate: seed.durationEstimate,
        workersNeeded: seed.workersNeeded,
        requiresIdVerification: (seed as any).requiresIdVerification || false,
        latitude: -15.3875 + (Math.random() - 0.5) * 0.05,
        longitude: 28.3228 + (Math.random() - 0.5) * 0.05,
        city: "Lusaka",
        country: "Zambia",
      },
    });
    created++;
  }
  console.log(`Created ${created} new job posts (skipped any that already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
