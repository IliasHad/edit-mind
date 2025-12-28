-- AlterTable
ALTER TABLE "Folder" ADD COLUMN     "excludePatterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "includePatterns" TEXT[] DEFAULT ARRAY['*.mp4', '*.mov', '*.avi', '*.mkv']::TEXT[],
ADD COLUMN     "lastWatcherScan" TIMESTAMP(3),
ADD COLUMN     "watcherEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primaryFaceLabel" TEXT,
    "notifyOnJobComplete" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnErrors" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
