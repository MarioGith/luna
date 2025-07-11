-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('FILE', 'LIVE_RECORDING');

-- CreateTable
CREATE TABLE "AudioTranscription" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "duration" DOUBLE PRECISION,
    "originalText" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "language" TEXT,
    "confidence" DOUBLE PRECISION,
    "embedding" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'FILE',
    "tags" TEXT[],

    CONSTRAINT "AudioTranscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AudioTranscription_createdAt_idx" ON "AudioTranscription"("createdAt");

-- CreateIndex
CREATE INDEX "AudioTranscription_sourceType_idx" ON "AudioTranscription"("sourceType");

-- CreateIndex
CREATE INDEX "AudioTranscription_tags_idx" ON "AudioTranscription"("tags");
