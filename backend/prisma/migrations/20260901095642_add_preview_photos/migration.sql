-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "previewPhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
