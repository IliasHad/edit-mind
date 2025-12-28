/*
  Warnings:

  - You are about to drop the column `collectionId` on the `Export` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Export" DROP CONSTRAINT "Export_collectionId_fkey";

-- AlterTable
ALTER TABLE "Export" DROP COLUMN "collectionId",
ADD COLUMN     "name" TEXT;
