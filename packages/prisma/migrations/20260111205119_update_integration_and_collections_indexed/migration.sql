/*
  Warnings:

  - A unique constraint covering the columns `[type,userId]` on the table `Integration` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Collection_type_name_idx" ON "Collection"("type", "name");

-- CreateIndex
CREATE INDEX "Integration_type_userId_idx" ON "Integration"("type", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_type_userId_key" ON "Integration"("type", "userId");
