/*
  Warnings:

  - You are about to drop the column `immichApiKey` on the `Integration` table. All the data in the column will be lost.
  - You are about to drop the column `immichBaseUrl` on the `Integration` table. All the data in the column will be lost.
  - You are about to alter the column `instructions` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(5000)`.
  - A unique constraint covering the columns `[source,userId]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('Immich');

-- DropIndex
DROP INDEX "Integration_userId_key";

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "isThinking" SET DEFAULT false;

-- AlterTable
ALTER TABLE "Folder" ALTER COLUMN "excludePatterns" SET DEFAULT ARRAY['*.part', '*.temp']::TEXT[];

-- AlterTable
ALTER TABLE "Integration" DROP COLUMN "immichApiKey",
DROP COLUMN "immichBaseUrl",
ADD COLUMN     "type" "IntegrationType" NOT NULL DEFAULT 'Immich';

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "instructions" SET DATA TYPE VARCHAR(5000);

-- CreateIndex
CREATE UNIQUE INDEX "Video_source_userId_key" ON "Video"("source", "userId");
