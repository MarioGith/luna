-- Schema Management Tables
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

-- Schema Evolution History
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

-- Knowledge Pattern Detection
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

-- Auto-Generated Tables Registry
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

-- Create indexes for performance
CREATE INDEX "schema_proposals_status_idx" ON "schema_proposals"("status");
CREATE INDEX "schema_proposals_priority_idx" ON "schema_proposals"("priority");
CREATE INDEX "schema_proposals_createdAt_idx" ON "schema_proposals"("createdAt");

CREATE INDEX "schema_evolution_history_proposalId_idx" ON "schema_evolution_history"("proposalId");
CREATE INDEX "schema_evolution_history_executedAt_idx" ON "schema_evolution_history"("executedAt");

CREATE INDEX "knowledge_patterns_confidence_idx" ON "knowledge_patterns"("confidence");
CREATE INDEX "knowledge_patterns_frequency_idx" ON "knowledge_patterns"("frequency");
CREATE INDEX "knowledge_patterns_status_idx" ON "knowledge_patterns"("status");

CREATE INDEX "dynamic_tables_isActive_idx" ON "dynamic_tables"("isActive");

-- Foreign key constraints
ALTER TABLE "schema_evolution_history" ADD CONSTRAINT "schema_evolution_history_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "schema_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dynamic_tables" ADD CONSTRAINT "dynamic_tables_createdFromProposal_fkey" FOREIGN KEY ("createdFromProposal") REFERENCES "schema_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
