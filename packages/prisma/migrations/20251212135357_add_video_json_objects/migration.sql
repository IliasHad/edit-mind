/*
  Warnings:

  - Added the required column `thumbnailUrl` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "emotions" JSONB,
ADD COLUMN     "faces" JSONB,
ADD COLUMN     "objects" JSONB,
ADD COLUMN     "shotTypes" JSONB,
ADD COLUMN     "thumbnailUrl" TEXT NOT NULL;
