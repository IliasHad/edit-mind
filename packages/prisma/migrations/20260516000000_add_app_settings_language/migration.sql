-- CreateEnum
CREATE TYPE "AppLanguage" AS ENUM ('en', 'ru');

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "language" "AppLanguage" NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);
