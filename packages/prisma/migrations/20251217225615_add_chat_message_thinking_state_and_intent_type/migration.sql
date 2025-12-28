-- CreateEnum
CREATE TYPE "MessageIntent" AS ENUM ('compilation', 'analytics', 'general', 'refinement', 'similarity');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "intent" "MessageIntent",
ADD COLUMN     "isThinking" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "text" DROP NOT NULL;
