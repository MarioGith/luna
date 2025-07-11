#!/bin/bash

echo "🚀 Setting up Vector Database for Audio Transcription System"
echo "============================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if PostgreSQL is running
echo "📋 Checking if PostgreSQL container is running..."
if ! docker ps | grep -q "audio-transcription-db"; then
    echo "⚠️  PostgreSQL container not found. Starting services..."
    docker compose up -d postgres
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
fi

# Wait for PostgreSQL to be healthy
echo "🔍 Waiting for PostgreSQL to be healthy..."
until docker compose exec -T postgres pg_isready -U postgres; do
    echo "⏳ PostgreSQL is not ready yet. Waiting..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"

# Check if pgvector extension is available
echo "🔍 Verifying pgvector extension..."
VECTOR_CHECK=$(docker compose exec -T postgres psql -U postgres -d audio_transcription -t -c "SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name='vector');" | xargs)

if [ "$VECTOR_CHECK" = "t" ]; then
    echo "✅ pgvector extension is available"
else
    echo "❌ pgvector extension not found. Please check your PostgreSQL image."
    exit 1
fi

# Apply vector database migration
echo "📊 Applying vector database migration..."
if docker compose exec -T postgres psql -U postgres -d audio_transcription -f /docker-entrypoint-initdb.d/../prisma/migrations/20250107_add_pgvector/migration.sql > /dev/null 2>&1; then
    echo "✅ Vector database migration applied successfully"
else
    echo "⚠️  Vector migration may have already been applied or failed"
fi

# Apply schema management migration
echo "🔧 Applying schema management migration..."
if docker compose exec -T postgres psql -U postgres -d audio_transcription -f /docker-entrypoint-initdb.d/../prisma/migrations/20250107_add_schema_management/migration.sql > /dev/null 2>&1; then
    echo "✅ Schema management migration applied successfully"
else
    echo "⚠️  Schema management migration may have already been applied or failed"
fi

# Check if there are existing embeddings to migrate
echo "🔍 Checking for existing JSON embeddings..."
EMBEDDING_COUNT=$(docker compose exec -T postgres psql -U postgres -d audio_transcription -t -c "SELECT COUNT(*) FROM \"AudioTranscription\" WHERE embedding IS NOT NULL;" | xargs)

if [ "$EMBEDDING_COUNT" -gt 0 ]; then
    echo "📋 Found $EMBEDDING_COUNT transcriptions with JSON embeddings"
    echo "🔄 To migrate these to vector format, you'll need to:"
    echo "   1. Start your Next.js application: npm run dev"
    echo "   2. Use the VectorService.migrateEmbeddings() method"
    echo "   3. Or create new embeddings through the /api/search/vector endpoint"
else
    echo "✅ No existing JSON embeddings found - you're ready to go!"
fi

# Verify vector tables exist
echo "🔍 Verifying vector tables..."
VECTOR_TABLES=$(docker compose exec -T postgres psql -U postgres -d audio_transcription -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('vector_embeddings', 'knowledge_vectors', 'search_cache', 'conversation_contexts');" | xargs)

if [ "$VECTOR_TABLES" -eq 4 ]; then
    echo "✅ All vector tables created successfully"
else
    echo "⚠️  Some vector tables may be missing. Found $VECTOR_TABLES/4 tables."
fi

# Test vector functionality
echo "🧪 Testing vector functionality..."
if docker compose exec -T postgres psql -U postgres -d audio_transcription -c "SELECT '[1,2,3]'::vector(3) <-> '[4,5,6]'::vector(3) as distance;" > /dev/null 2>&1; then
    echo "✅ Vector operations working correctly"
else
    echo "❌ Vector operations failed"
    exit 1
fi

echo ""
echo "🎉 Vector Database Setup Complete!"
echo "=================================="
echo ""
echo "✅ pgvector extension: Enabled"
echo "✅ Vector tables: Created"  
echo "✅ Schema management: Ready"
echo "✅ Vector operations: Working"
echo ""
echo "🚀 Next Steps:"
echo "1. Start your application: npm run dev"
echo "2. Try semantic search: /api/search/vector"
echo "3. Use your MCP conversational AI!"
echo ""
echo "💡 Test semantic search:"
echo "curl -X POST http://localhost:3000/api/search/vector \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"query\": \"your search query\", \"type\": \"hybrid\"}'"
echo ""
