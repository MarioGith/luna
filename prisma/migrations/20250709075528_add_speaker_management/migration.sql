-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptionSpeaker" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "speakerId" TEXT,
    "detectedSpeakerLabel" TEXT NOT NULL,
    "segments" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranscriptionSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Speaker_name_idx" ON "Speaker"("name");

-- CreateIndex
CREATE INDEX "TranscriptionSpeaker_transcriptionId_idx" ON "TranscriptionSpeaker"("transcriptionId");

-- CreateIndex
CREATE INDEX "TranscriptionSpeaker_speakerId_idx" ON "TranscriptionSpeaker"("speakerId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptionSpeaker_transcriptionId_detectedSpeakerLabel_key" ON "TranscriptionSpeaker"("transcriptionId", "detectedSpeakerLabel");

-- AddForeignKey
ALTER TABLE "TranscriptionSpeaker" ADD CONSTRAINT "TranscriptionSpeaker_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptionSpeaker" ADD CONSTRAINT "TranscriptionSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;
