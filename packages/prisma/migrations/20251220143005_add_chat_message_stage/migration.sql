-- CreateEnum
CREATE TYPE "MessageStage" AS ENUM ('understanding', 'searching', 'analyzing', 'compiling', 'refining');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "stage" "MessageStage";
