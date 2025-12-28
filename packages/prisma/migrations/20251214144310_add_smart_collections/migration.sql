-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('visual_style', 'subject_matter', 'emotional_tone', 'aspect_ratio', 'time_of_day', 'use_case', 'people', 'location', 'custom');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('active', 'archived', 'processing');

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CollectionType" NOT NULL,
    "isAutoPopulated" BOOLEAN NOT NULL DEFAULT true,
    "autoUpdateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB,
    "requiredObjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredEmotions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredFaces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationName" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'active',
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "totalDuration" BIGINT NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thumbnailUrl" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "sceneIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'embedding',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "userNotes" TEXT,
    "collectionId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Collection_userId_type_idx" ON "Collection"("userId", "type");

-- CreateIndex
CREATE INDEX "Collection_userId_status_idx" ON "Collection"("userId", "status");

-- CreateIndex
CREATE INDEX "Collection_type_status_idx" ON "Collection"("type", "status");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_confidence_idx" ON "CollectionItem"("collectionId", "confidence");

-- CreateIndex
CREATE INDEX "CollectionItem_videoId_idx" ON "CollectionItem"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_videoId_key" ON "CollectionItem"("collectionId", "videoId");

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
