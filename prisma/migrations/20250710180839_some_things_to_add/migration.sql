-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "AudioTranscription" ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "hasBeenAnalyzed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EntityType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "schema" TEXT,

    CONSTRAINT "EntityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeEntity" (
    "id" TEXT NOT NULL,
    "entityTypeId" TEXT NOT NULL,
    "transcriptionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityAttribute" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityRelationship" (
    "id" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "description" TEXT,
    "confidence" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractionReview" (
    "id" TEXT NOT NULL,
    "transcriptionId" TEXT NOT NULL,
    "entityId" TEXT,
    "entityTypeId" TEXT NOT NULL,
    "extractedData" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractionReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityType_name_key" ON "EntityType"("name");

-- CreateIndex
CREATE INDEX "EntityType_name_idx" ON "EntityType"("name");

-- CreateIndex
CREATE INDEX "EntityType_isActive_idx" ON "EntityType"("isActive");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_entityTypeId_idx" ON "KnowledgeEntity"("entityTypeId");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_transcriptionId_idx" ON "KnowledgeEntity"("transcriptionId");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_isVerified_idx" ON "KnowledgeEntity"("isVerified");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_isActive_idx" ON "KnowledgeEntity"("isActive");

-- CreateIndex
CREATE INDEX "KnowledgeEntity_createdAt_idx" ON "KnowledgeEntity"("createdAt");

-- CreateIndex
CREATE INDEX "EntityAttribute_entityId_idx" ON "EntityAttribute"("entityId");

-- CreateIndex
CREATE INDEX "EntityAttribute_key_idx" ON "EntityAttribute"("key");

-- CreateIndex
CREATE UNIQUE INDEX "EntityAttribute_entityId_key_key" ON "EntityAttribute"("entityId", "key");

-- CreateIndex
CREATE INDEX "EntityRelationship_sourceEntityId_idx" ON "EntityRelationship"("sourceEntityId");

-- CreateIndex
CREATE INDEX "EntityRelationship_targetEntityId_idx" ON "EntityRelationship"("targetEntityId");

-- CreateIndex
CREATE INDEX "EntityRelationship_relationshipType_idx" ON "EntityRelationship"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRelationship_sourceEntityId_targetEntityId_relationsh_key" ON "EntityRelationship"("sourceEntityId", "targetEntityId", "relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractionReview_entityId_key" ON "ExtractionReview"("entityId");

-- CreateIndex
CREATE INDEX "ExtractionReview_transcriptionId_idx" ON "ExtractionReview"("transcriptionId");

-- CreateIndex
CREATE INDEX "ExtractionReview_status_idx" ON "ExtractionReview"("status");

-- CreateIndex
CREATE INDEX "ExtractionReview_createdAt_idx" ON "ExtractionReview"("createdAt");

-- CreateIndex
CREATE INDEX "AudioTranscription_hasBeenAnalyzed_idx" ON "AudioTranscription"("hasBeenAnalyzed");

-- CreateIndex
CREATE INDEX "AudioTranscription_analysisStatus_idx" ON "AudioTranscription"("analysisStatus");

-- AddForeignKey
ALTER TABLE "KnowledgeEntity" ADD CONSTRAINT "KnowledgeEntity_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeEntity" ADD CONSTRAINT "KnowledgeEntity_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAttribute" ADD CONSTRAINT "EntityAttribute_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
