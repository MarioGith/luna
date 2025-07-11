/*
  Warnings:

  - You are about to drop the column `model` on the `AudioTranscription` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerInputToken` on the `AudioTranscription` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerOutputToken` on the `AudioTranscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "AudioTranscription" DROP COLUMN "model",
DROP COLUMN "pricePerInputToken",
DROP COLUMN "pricePerOutputToken",
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "embeddingPriceInput" DOUBLE PRECISION,
ADD COLUMN     "transcriptionModel" TEXT,
ADD COLUMN     "transcriptionPriceInput" DOUBLE PRECISION,
ADD COLUMN     "transcriptionPriceOutput" DOUBLE PRECISION;
