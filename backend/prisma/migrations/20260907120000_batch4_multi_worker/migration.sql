-- Preserve existing assignments by deriving their worker from the accepted bid.
ALTER TABLE "JobAssignment" ADD COLUMN "workerId" TEXT;

UPDATE "JobAssignment" AS assignment
SET "workerId" = bid."bidderId"
FROM "Bid" AS bid
WHERE assignment."bidId" = bid."id";

ALTER TABLE "JobAssignment" ALTER COLUMN "workerId" SET NOT NULL;

ALTER TABLE "Job" DROP CONSTRAINT "Job_workerId_fkey";
ALTER TABLE "Job" DROP COLUMN "workerId";

DROP INDEX "JobAssignment_jobId_key";
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");
CREATE INDEX "JobAssignment_workerId_idx" ON "JobAssignment"("workerId");

ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Job" ADD COLUMN "expiresAt" TIMESTAMP(3);
UPDATE "Job" SET "expiresAt" = "createdAt" + INTERVAL '30 days';
ALTER TABLE "Job" ALTER COLUMN "expiresAt" SET NOT NULL;
