-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('created', 'ready', 'processing');

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'created',
    "userId" TEXT NOT NULL,
    "sceneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Export_userId_status_idx" ON "Export"("userId", "status");

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
