/*
  Warnings:

  - You are about to drop the column `filters` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `locationName` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `requiredEmotions` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `requiredFaces` on the `Collection` table. All the data in the column will be lost.
  - You are about to drop the column `requiredObjects` on the `Collection` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Collection" DROP COLUMN "filters",
DROP COLUMN "locationName",
DROP COLUMN "requiredEmotions",
DROP COLUMN "requiredFaces",
DROP COLUMN "requiredObjects";
