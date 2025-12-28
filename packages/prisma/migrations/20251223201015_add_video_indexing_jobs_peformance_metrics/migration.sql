/*
  Warnings:

  - The values [embedding] on the enum `JobStage` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "JobStage_new" AS ENUM ('starting', 'transcribing', 'frame_analysis', 'creating_scenes', 'embedding_text', 'embedding_visual', 'embedding_audio');
ALTER TABLE "public"."Job" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "Job" ALTER COLUMN "stage" TYPE "JobStage_new" USING ("stage"::text::"JobStage_new");
ALTER TYPE "JobStage" RENAME TO "JobStage_old";
ALTER TYPE "JobStage_new" RENAME TO "JobStage";
DROP TYPE "public"."JobStage_old";
ALTER TABLE "Job" ALTER COLUMN "stage" SET DEFAULT 'starting';
COMMIT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "audioEmbeddingTime" INTEGER,
ADD COLUMN     "frameAnalysisPlugins" JSONB,
ADD COLUMN     "frameAnalysisTime" INTEGER,
ADD COLUMN     "sceneCreationTime" INTEGER,
ADD COLUMN     "textEmbeddingTime" INTEGER,
ADD COLUMN     "totalProcessingTime" INTEGER,
ADD COLUMN     "transcriptionTime" INTEGER,
ADD COLUMN     "visualEmbeddingTime" INTEGER;
