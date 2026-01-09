/*
  Warnings:

  - You are about to drop the `_CollectionToExport` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[exportId]` on the table `ChatMessage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "_CollectionToExport" DROP CONSTRAINT "_CollectionToExport_A_fkey";

-- DropForeignKey
ALTER TABLE "_CollectionToExport" DROP CONSTRAINT "_CollectionToExport_B_fkey";

-- AlterTable
ALTER TABLE "Export" ADD COLUMN     "collectionId" TEXT;

-- DropTable
DROP TABLE "_CollectionToExport";

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_exportId_key" ON "ChatMessage"("exportId");

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
