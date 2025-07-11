import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class VectorService {
  private prisma: PrismaClient;
  private embeddingModel: any;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const result = await this.embeddingModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Store vector embedding in database
   */
  async storeEmbedding(params: {
    sourceId: string;
    sourceType: 'TRANSCRIPTION' | 'KNOWLEDGE_ENTITY' | 'CONVERSATION' | 'SEARCH_QUERY';
    text: string;
    embedding: number[];
  }) {
    const { sourceId, sourceType, text, embedding } = params;
    
    return await this.prisma.$executeRaw`
      INSERT INTO vector_embeddings (id, "sourceId", "sourceType", text, embedding, tokens, model)
      VALUES (${crypto.randomUUID()}, ${sourceId}, ${sourceType}, ${text}, ${embedding}, ${Math.ceil(text.length / 4)}, 'text-embedding-004')
    `;
  }

  /**
   * Semantic search across transcriptions
   */
  async searchTranscriptions(query: string, limit: number = 10, threshold: number = 0.7) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.prisma.$queryRaw`
      SELECT 
        ve.id,
        ve."sourceId",
        ve.text,
        at.id as transcription_id,
        at."fileName",
        at."originalText",
        at."createdAt",
        at.tags,
        (1 - (ve.embedding <=> ${queryEmbedding}::vector)) as similarity
      FROM vector_embeddings ve
      JOIN "AudioTranscription" at ON ve."sourceId" = at.id
      WHERE ve."sourceType" = 'TRANSCRIPTION'
        AND (1 - (ve.embedding <=> ${queryEmbedding}::vector)) > ${threshold}
      ORDER BY ve.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Semantic search across knowledge entities
   */
  async searchKnowledge(query: string, limit: number = 10, threshold: number = 0.7) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await this.prisma.$queryRaw`
      SELECT 
        kv.id,
        kv."entityId",
        kv.title,
        kv.description,
        kv."entityType",
        kv."isVerified",
        ke.id as knowledge_entity_id,
        ke.title as entity_title,
        ke.description as entity_description,
        (1 - (kv."titleEmbedding" <=> ${queryEmbedding}::vector)) as title_similarity,
        CASE 
          WHEN kv."descriptionEmbedding" IS NOT NULL 
          THEN (1 - (kv."descriptionEmbedding" <=> ${queryEmbedding}::vector))
          ELSE NULL
        END as description_similarity
      FROM knowledge_vectors kv
      JOIN "KnowledgeEntity" ke ON kv."entityId" = ke.id
      WHERE (1 - (kv."titleEmbedding" <=> ${queryEmbedding}::vector)) > ${threshold}
        OR (kv."descriptionEmbedding" IS NOT NULL AND (1 - (kv."descriptionEmbedding" <=> ${queryEmbedding}::vector)) > ${threshold})
      ORDER BY 
        GREATEST(
          (1 - (kv."titleEmbedding" <=> ${queryEmbedding}::vector)),
          COALESCE((1 - (kv."descriptionEmbedding" <=> ${queryEmbedding}::vector)), 0)
        ) DESC
      LIMIT ${limit}
    `;

    return results;
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(query: string, limit: number = 10) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Semantic search
    const semanticResults = await this.searchTranscriptions(query, limit);
    
    // Keyword search
    const keywordResults = await this.prisma.$queryRaw`
      SELECT 
        at.id,
        at."fileName",
        at."originalText",
        at."createdAt",
        at.tags,
        ts_rank(to_tsvector('english', at."originalText"), plainto_tsquery('english', ${query})) as rank
      FROM "AudioTranscription" at
      WHERE to_tsvector('english', at."originalText") @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT ${limit}
    `;

    // Combine and deduplicate results
    const combinedResults = this.combineSearchResults(
      Array.isArray(semanticResults) ? semanticResults : [],
      Array.isArray(keywordResults) ? keywordResults : []
    );
    
    return combinedResults.slice(0, limit);
  }

  /**
   * Get or create cached search results
   */
  async getCachedSearch(query: string) {
    const queryHash = crypto.createHash('md5').update(query).digest('hex');
    
    const cached = await this.prisma.$queryRaw`
      SELECT * FROM search_cache 
      WHERE "queryHash" = ${queryHash} 
        AND "createdAt" > NOW() - INTERVAL '1 hour'
      LIMIT 1
    `;

    if (cached && Array.isArray(cached) && cached.length > 0) {
      return JSON.parse(cached[0].results);
    }

    // Generate new results
    const results = await this.hybridSearch(query);
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Cache the results
    await this.prisma.$executeRaw`
      INSERT INTO search_cache (id, query, "queryHash", "queryEmbedding", results, "resultCount", "searchType", model)
      VALUES (${crypto.randomUUID()}, ${query}, ${queryHash}, ${queryEmbedding}, ${JSON.stringify(results)}, ${results.length}, 'HYBRID', 'text-embedding-004')
      ON CONFLICT ("queryHash") DO UPDATE SET
        results = EXCLUDED.results,
        "resultCount" = EXCLUDED."resultCount",
        "createdAt" = CURRENT_TIMESTAMP
    `;

    return results;
  }

  /**
   * RAG context retrieval for conversational AI
   */
  async getConversationContext(sessionId: string, query: string, maxContext: number = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Get relevant context from transcriptions and knowledge
    const transcriptionContext = await this.searchTranscriptions(query, maxContext);
    const knowledgeContext = await this.searchKnowledge(query, maxContext);
    
    // Get conversation history
    const conversationHistory = await this.prisma.$queryRaw`
      SELECT * FROM conversation_contexts 
      WHERE "sessionId" = ${sessionId}
      ORDER BY "createdAt" DESC
      LIMIT 5
    `;

    // Combine context
    const context = {
      transcriptions: transcriptionContext,
      knowledge: knowledgeContext,
      conversation: conversationHistory,
      query,
      timestamp: new Date()
    };

    // Store conversation context
    await this.prisma.$executeRaw`
      INSERT INTO conversation_contexts (id, "sessionId", "contextWindow", "lastQuery", "contextEmbedding")
      VALUES (${crypto.randomUUID()}, ${sessionId}, ${JSON.stringify(context)}, ${query}, ${queryEmbedding})
    `;

    return context;
  }

  /**
   * Migrate existing JSON embeddings to vector format
   */
  async migrateEmbeddings() {
    const transcriptions = await this.prisma.audioTranscription.findMany({
      where: {
        embedding: { not: null }
      },
      select: {
        id: true,
        originalText: true,
        embedding: true
      }
    });

    console.log(`Migrating ${transcriptions.length} embeddings to vector format...`);

    for (const transcription of transcriptions) {
      try {
        const embedding = JSON.parse(transcription.embedding!);
        
        await this.storeEmbedding({
          sourceId: transcription.id,
          sourceType: 'TRANSCRIPTION',
          text: transcription.originalText,
          embedding: embedding
        });
        
        console.log(`✅ Migrated embedding for transcription ${transcription.id}`);
      } catch (error) {
        console.error(`❌ Failed to migrate embedding for transcription ${transcription.id}:`, error);
      }
    }

    console.log('Migration completed!');
  }

  /**
   * Create knowledge vectors for existing entities
   */
  async createKnowledgeVectors() {
    const entities = await this.prisma.knowledgeEntity.findMany({
      include: {
        entityType: true
      }
    });

    console.log(`Creating vectors for ${entities.length} knowledge entities...`);

    for (const entity of entities) {
      try {
        const titleEmbedding = await this.generateEmbedding(entity.title);
        const descriptionEmbedding = entity.description 
          ? await this.generateEmbedding(entity.description)
          : null;

        await this.prisma.$executeRaw`
          INSERT INTO knowledge_vectors (id, "entityId", title, description, "titleEmbedding", "descriptionEmbedding", "entityType", confidence, "isVerified")
          VALUES (
            ${crypto.randomUUID()}, 
            ${entity.id}, 
            ${entity.title}, 
            ${entity.description}, 
            ${titleEmbedding}, 
            ${descriptionEmbedding}, 
            ${entity.entityType.name}, 
            ${entity.confidence}, 
            ${entity.isVerified}
          )
        `;
        
        console.log(`✅ Created vector for entity ${entity.title}`);
      } catch (error) {
        console.error(`❌ Failed to create vector for entity ${entity.title}:`, error);
      }
    }

    console.log('Knowledge vectors created!');
  }

  /**
   * Combine search results from different sources
   */
  private combineSearchResults(semanticResults: any[], keywordResults: any[]) {
    const combined = [...(Array.isArray(semanticResults) ? semanticResults : [])];
    const seenIds = new Set(semanticResults.map(r => r.id || r.transcription_id));
    
    const keywordArray = Array.isArray(keywordResults) ? keywordResults : [];
    for (const keywordResult of keywordArray) {
      if (!seenIds.has(keywordResult.id)) {
        combined.push({ ...keywordResult, similarity: keywordResult.rank });
        seenIds.add(keywordResult.id);
      }
    }
    
    return combined.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  }
}

export default VectorService;
