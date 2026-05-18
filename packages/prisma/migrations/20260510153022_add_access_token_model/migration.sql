-- CreateEnum
CREATE TYPE "AccessTokenScope" AS ENUM ('videos_read', 'collections_read', 'folders_read', 'jobs_read', 'media_read', 'chats_write', 'collections_write', 'folders_write', 'videos_write');

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tokenHash" TEXT NOT NULL,
    "scopes" "AccessTokenScope"[] DEFAULT ARRAY[]::"AccessTokenScope"[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "lastUsedUserAgent" TEXT,
    "allowedIps" TEXT[] DEFAULT ARRAY['*']::TEXT[],
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_tokenHash_key" ON "AccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccessToken_tokenHash_idx" ON "AccessToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "AccessToken" ADD CONSTRAINT "AccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
