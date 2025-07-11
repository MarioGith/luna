-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector embeddings table
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

-- Create knowledge vectors table
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

-- Create search cache table
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

-- Create conversation contexts table
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

-- Create indexes for efficient vector similarity search
CREATE INDEX "vector_embeddings_sourceType_idx" ON "vector_embeddings"("sourceType");
CREATE INDEX "vector_embeddings_createdAt_idx" ON "vector_embeddings"("createdAt");

CREATE INDEX "knowledge_vectors_entityType_idx" ON "knowledge_vectors"("entityType");
CREATE INDEX "knowledge_vectors_isVerified_idx" ON "knowledge_vectors"("isVerified");

CREATE UNIQUE INDEX "search_cache_queryHash_key" ON "search_cache"("queryHash");
CREATE INDEX "search_cache_queryHash_idx" ON "search_cache"("queryHash");
CREATE INDEX "search_cache_searchType_idx" ON "search_cache"("searchType");

CREATE INDEX "conversation_contexts_sessionId_idx" ON "conversation_contexts"("sessionId");
CREATE INDEX "conversation_contexts_userId_idx" ON "conversation_contexts"("userId");

-- Create vector similarity search indexes (HNSW for fast approximate nearest neighbor search)
CREATE INDEX ON "vector_embeddings" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX ON "knowledge_vectors" USING hnsw ("titleEmbedding" vector_cosine_ops);
CREATE INDEX ON "knowledge_vectors" USING hnsw ("descriptionEmbedding" vector_cosine_ops);
CREATE INDEX ON "search_cache" USING hnsw ("queryEmbedding" vector_cosine_ops);
CREATE INDEX ON "conversation_contexts" USING hnsw ("contextEmbedding" vector_cosine_ops);

-- Add foreign key constraints
ALTER TABLE "knowledge_vectors" ADD CONSTRAINT "knowledge_vectors_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "KnowledgeEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
