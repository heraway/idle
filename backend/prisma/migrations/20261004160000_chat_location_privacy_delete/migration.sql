-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "locationKind" TEXT;

-- Old finished jobs must stop exposing locations shared in chat: wipe pins on
-- messages belonging to jobs that are already COMPLETED or CANCELLED.
UPDATE "Message"
SET "latitude" = NULL, "longitude" = NULL, "locationLabel" = NULL
WHERE "latitude" IS NOT NULL
  AND "jobId" IN (SELECT "id" FROM "Job" WHERE "status" IN ('COMPLETED', 'CANCELLED'));
