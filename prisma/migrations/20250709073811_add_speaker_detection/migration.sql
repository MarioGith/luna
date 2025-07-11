-- AlterTable
ALTER TABLE "AudioTranscription" ADD COLUMN     "hasSpeakerDiarization" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "speakerCount" INTEGER,
ADD COLUMN     "speakerMetadata" TEXT,
ADD COLUMN     "speakerTranscription" TEXT;
