-- ================================
-- CONSOLIDATED MIGRATION
-- Combines all existing migrations into a single, dependency-safe migration
-- ================================

-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================
-- ENUMS
-- ================================

CREATE TYPE "SourceType" AS ENUM ('FILE', 'LIVE_RECORDING');
CREATE TYPE "ExtractionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED');
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- ================================
-- AUTHENTICATION TABLES (NextAuth.js)
-- ================================

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "githubId" TEXT,
    "githubUsername" TEXT,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- ================================
-- CORE TRANSCRIPTION SYSTEM
-- ================================

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
    "userId" TEXT,
    
    -- Cost tracking fields
    "embeddingCost" DOUBLE PRECISION,
    "exchangeRate" DOUBLE PRECISION,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalCost" DOUBLE PRECISION,
    "transcriptionCost" DOUBLE PRECISION,
    
    -- Model selection fields
    "embeddingModel" TEXT,
    "embeddingPriceInput" DOUBLE PRECISION,
    "transcriptionModel" TEXT,
    "transcriptionPriceInput" DOUBLE PRECISION,
    "transcriptionPriceOutput" DOUBLE PRECISION,
    
    -- Speaker detection fields
    "hasSpeakerDiarization" BOOLEAN NOT NULL DEFAULT false,
    "speakerCount" INTEGER,
    "speakerMetadata" TEXT,
    "speakerTranscription" TEXT,
    
    -- Analysis fields
    "analysisError" TEXT,
    "analysisStatus" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "hasBeenAnalyzed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AudioTranscription_pkey" PRIMARY KEY ("id")
);

-- ================================
-- SPEAKER MANAGEMENT
-- ================================

CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

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

-- ================================
-- KNOWLEDGE MANAGEMENT SYSTEM
-- ================================

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

-- ================================
-- VECTOR EMBEDDINGS SYSTEM
-- ================================

CREATE TABLE "vector_embeddings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "text" TEXT NOT NULL,
    "tokens" INTEGER,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-004',

    CONSTRAINT "vector_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_vectors" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "titleEmbedding" vector(1536) NOT NULL,
    "descriptionEmbedding" vector(1536),
    "entityType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "knowledge_vectors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "search_cache" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "queryHash" TEXT NOT NULL,
    "queryEmbedding" vector(1536) NOT NULL,
    "results" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "searchType" TEXT NOT NULL DEFAULT 'SEMANTIC',
    "model" TEXT NOT NULL DEFAULT 'text-embedding-004',

    CONSTRAINT "search_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_contexts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "contextWindow" TEXT NOT NULL,
    "lastQuery" TEXT NOT NULL,
    "contextEmbedding" vector(1536) NOT NULL,

    CONSTRAINT "conversation_contexts_pkey" PRIMARY KEY ("id")
);

-- ================================
-- COST TRACKING SYSTEM
-- ================================

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

-- ================================
-- SCHEMA MANAGEMENT SYSTEM
-- ================================

CREATE TABLE "schema_proposals" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "sqlPreview" TEXT NOT NULL,
    "supportingData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "implementedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,

    CONSTRAINT "schema_proposals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "schema_evolution_history" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "sqlExecuted" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedBy" TEXT,
    "rollbackSql" TEXT,

    CONSTRAINT "schema_evolution_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "frequency" INTEGER NOT NULL,
    "examples" TEXT NOT NULL,
    "suggestedStructure" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAnalyzed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_patterns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dynamic_tables" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL UNIQUE,
    "createdFromProposal" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastModified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynamic_tables_pkey" PRIMARY KEY ("id")
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================

-- Authentication indexes
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");
CREATE UNIQUE INDEX "User_githubUsername_key" ON "User"("githubUsername");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AudioTranscription indexes
CREATE INDEX "AudioTranscription_createdAt_idx" ON "AudioTranscription"("createdAt");
CREATE INDEX "AudioTranscription_sourceType_idx" ON "AudioTranscription"("sourceType");
CREATE INDEX "AudioTranscription_tags_idx" ON "AudioTranscription"("tags");
CREATE INDEX "AudioTranscription_userId_idx" ON "AudioTranscription"("userId");
CREATE INDEX "AudioTranscription_hasBeenAnalyzed_idx" ON "AudioTranscription"("hasBeenAnalyzed");
CREATE INDEX "AudioTranscription_analysisStatus_idx" ON "AudioTranscription"("analysisStatus");

-- Speaker indexes
CREATE INDEX "Speaker_name_idx" ON "Speaker"("name");
CREATE INDEX "TranscriptionSpeaker_transcriptionId_idx" ON "TranscriptionSpeaker"("transcriptionId");
CREATE INDEX "TranscriptionSpeaker_speakerId_idx" ON "TranscriptionSpeaker"("speakerId");
CREATE UNIQUE INDEX "TranscriptionSpeaker_transcriptionId_detectedSpeakerLabel_key" ON "TranscriptionSpeaker"("transcriptionId", "detectedSpeakerLabel");

-- Knowledge system indexes
CREATE UNIQUE INDEX "EntityType_name_key" ON "EntityType"("name");
CREATE INDEX "EntityType_name_idx" ON "EntityType"("name");
CREATE INDEX "EntityType_isActive_idx" ON "EntityType"("isActive");
CREATE INDEX "KnowledgeEntity_entityTypeId_idx" ON "KnowledgeEntity"("entityTypeId");
CREATE INDEX "KnowledgeEntity_transcriptionId_idx" ON "KnowledgeEntity"("transcriptionId");
CREATE INDEX "KnowledgeEntity_isVerified_idx" ON "KnowledgeEntity"("isVerified");
CREATE INDEX "KnowledgeEntity_isActive_idx" ON "KnowledgeEntity"("isActive");
CREATE INDEX "KnowledgeEntity_createdAt_idx" ON "KnowledgeEntity"("createdAt");
CREATE INDEX "EntityAttribute_entityId_idx" ON "EntityAttribute"("entityId");
CREATE INDEX "EntityAttribute_key_idx" ON "EntityAttribute"("key");
CREATE UNIQUE INDEX "EntityAttribute_entityId_key_key" ON "EntityAttribute"("entityId", "key");
CREATE INDEX "EntityRelationship_sourceEntityId_idx" ON "EntityRelationship"("sourceEntityId");
CREATE INDEX "EntityRelationship_targetEntityId_idx" ON "EntityRelationship"("targetEntityId");
CREATE INDEX "EntityRelationship_relationshipType_idx" ON "EntityRelationship"("relationshipType");
CREATE UNIQUE INDEX "EntityRelationship_sourceEntityId_targetEntityId_relationsh_key" ON "EntityRelationship"("sourceEntityId", "targetEntityId", "relationshipType");
CREATE UNIQUE INDEX "ExtractionReview_entityId_key" ON "ExtractionReview"("entityId");
CREATE INDEX "ExtractionReview_transcriptionId_idx" ON "ExtractionReview"("transcriptionId");
CREATE INDEX "ExtractionReview_status_idx" ON "ExtractionReview"("status");
CREATE INDEX "ExtractionReview_createdAt_idx" ON "ExtractionReview"("createdAt");

-- Vector system indexes
CREATE INDEX "vector_embeddings_sourceType_idx" ON "vector_embeddings"("sourceType");
CREATE INDEX "vector_embeddings_createdAt_idx" ON "vector_embeddings"("createdAt");
CREATE INDEX "knowledge_vectors_entityType_idx" ON "knowledge_vectors"("entityType");
CREATE INDEX "knowledge_vectors_isVerified_idx" ON "knowledge_vectors"("isVerified");
CREATE UNIQUE INDEX "search_cache_queryHash_key" ON "search_cache"("queryHash");
CREATE INDEX "search_cache_queryHash_idx" ON "search_cache"("queryHash");
CREATE INDEX "search_cache_searchType_idx" ON "search_cache"("searchType");
CREATE INDEX "conversation_contexts_sessionId_idx" ON "conversation_contexts"("sessionId");
CREATE INDEX "conversation_contexts_userId_idx" ON "conversation_contexts"("userId");

-- Cost tracking indexes
CREATE INDEX "SearchCost_createdAt_idx" ON "SearchCost"("createdAt");

-- Schema management indexes
CREATE INDEX "schema_proposals_status_idx" ON "schema_proposals"("status");
CREATE INDEX "schema_proposals_priority_idx" ON "schema_proposals"("priority");
CREATE INDEX "schema_proposals_createdAt_idx" ON "schema_proposals"("createdAt");
CREATE INDEX "schema_evolution_history_proposalId_idx" ON "schema_evolution_history"("proposalId");
CREATE INDEX "schema_evolution_history_executedAt_idx" ON "schema_evolution_history"("executedAt");
CREATE INDEX "knowledge_patterns_confidence_idx" ON "knowledge_patterns"("confidence");
CREATE INDEX "knowledge_patterns_frequency_idx" ON "knowledge_patterns"("frequency");
CREATE INDEX "knowledge_patterns_status_idx" ON "knowledge_patterns"("status");
CREATE INDEX "dynamic_tables_isActive_idx" ON "dynamic_tables"("isActive");

-- ================================
-- VECTOR SIMILARITY SEARCH INDEXES (HNSW)
-- ================================

CREATE INDEX ON "vector_embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX ON "knowledge_vectors" USING hnsw ("titleEmbedding" vector_cosine_ops);
CREATE INDEX ON "knowledge_vectors" USING hnsw ("descriptionEmbedding" vector_cosine_ops);
CREATE INDEX ON "search_cache" USING hnsw ("queryEmbedding" vector_cosine_ops);
CREATE INDEX ON "conversation_contexts" USING hnsw ("contextEmbedding" vector_cosine_ops);

-- ================================
-- FOREIGN KEY CONSTRAINTS
-- ================================

-- Authentication foreign keys
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AudioTranscription foreign keys
ALTER TABLE "AudioTranscription" ADD CONSTRAINT "AudioTranscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Speaker foreign keys
ALTER TABLE "TranscriptionSpeaker" ADD CONSTRAINT "TranscriptionSpeaker_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TranscriptionSpeaker" ADD CONSTRAINT "TranscriptionSpeaker_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "Speaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Knowledge system foreign keys
ALTER TABLE "KnowledgeEntity" ADD CONSTRAINT "KnowledgeEntity_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEntity" ADD CONSTRAINT "KnowledgeEntity_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntityAttribute" ADD CONSTRAINT "EntityAttribute_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_sourceEntityId_fkey" FOREIGN KEY ("sourceEntityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntityRelationship" ADD CONSTRAINT "EntityRelationship_targetEntityId_fkey" FOREIGN KEY ("targetEntityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_transcriptionId_fkey" FOREIGN KEY ("transcriptionId") REFERENCES "AudioTranscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExtractionReview" ADD CONSTRAINT "ExtractionReview_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector system foreign keys
ALTER TABLE "knowledge_vectors" ADD CONSTRAINT "knowledge_vectors_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversation_contexts" ADD CONSTRAINT "conversation_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Schema management foreign keys
ALTER TABLE "schema_evolution_history" ADD CONSTRAINT "schema_evolution_history_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "schema_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dynamic_tables" ADD CONSTRAINT "dynamic_tables_createdFromProposal_fkey" FOREIGN KEY ("createdFromProposal") REFERENCES "schema_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================
-- MIGRATION COMPLETE
-- ================================
