-- AlterTable
ALTER TABLE "AudioTranscription" ADD COLUMN     "embeddingCost" DOUBLE PRECISION,
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "inputTokens" INTEGER,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "outputTokens" INTEGER,
ADD COLUMN     "pricePerInputToken" DOUBLE PRECISION,
ADD COLUMN     "pricePerOutputToken" DOUBLE PRECISION,
ADD COLUMN     "totalCost" DOUBLE PRECISION,
ADD COLUMN     "transcriptionCost" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "cost_summary" (
    "id" TEXT NOT NULL,
    "totalTranscriptionCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEmbeddingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSearchCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "model" TEXT NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SearchCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchCost_createdAt_idx" ON "SearchCost"("createdAt");
