import { NextRequest, NextResponse } from 'next/server'
import { searchSimilarTranscriptions } from '@/lib/gemini'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5, embeddingModel = 'text-embedding-004' } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Get all transcriptions with embeddings
    const transcriptions = await prisma.audioTranscription.findMany({
      where: {
        embedding: {
          not: null
        }
      },
      select: {
        id: true,
        originalText: true,
        markdown: true,
        fileName: true,
        createdAt: true,
        tags: true,
        embedding: true,
        confidence: true,
        sourceType: true
      }
    })

    if (transcriptions.length === 0) {
      return NextResponse.json({ results: [] })
    }

    // Parse embeddings and prepare data for search
    const embeddings = transcriptions.map(t => JSON.parse(t.embedding!))
    const texts = transcriptions.map(t => t.originalText)

    // Search for similar transcriptions
    const searchResult = await searchSimilarTranscriptions(query, embeddings, texts, limit, embeddingModel)

    // Map results back to full transcription data
    const results = searchResult.results.map(sim => ({
      ...transcriptions[sim.index],
      similarity: sim.similarity,
      embedding: undefined // Remove embedding from response for cleaner output
    }))

    // Track search cost
    const { trackSearchCost } = await import('@/lib/pricing')
    await trackSearchCost(query, searchResult.inputTokens, searchResult.model, searchResult.exchangeRate)

    return NextResponse.json({ 
      results,
      searchCost: searchResult.searchCost,
      inputTokens: searchResult.inputTokens,
      model: searchResult.model
    })

  } catch (error) {
    console.error('Error searching transcriptions:', error)
    return NextResponse.json({ 
      error: 'Failed to search transcriptions' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const tag = searchParams.get('tag')
    const sourceType = searchParams.get('sourceType')

    const where: Prisma.AudioTranscriptionWhereInput = {}
    
    if (tag) {
      where.tags = { has: tag }
    }
    
    if (sourceType) {
      where.sourceType = sourceType as 'FILE' | 'LIVE_RECORDING'
    }

    const transcriptions = await prisma.audioTranscription.findMany({
      where,
      select: {
        id: true,
        originalText: true,
        markdown: true,
        fileName: true,
        createdAt: true,
        tags: true,
        confidence: true,
        sourceType: true,
        fileSize: true,
        duration: true,
        // Include cost information
        inputTokens: true,
        outputTokens: true,
        transcriptionCost: true,
        embeddingCost: true,
        totalCost: true,
        transcriptionModel: true,
        embeddingModel: true,
        transcriptionPriceInput: true,
        transcriptionPriceOutput: true,
        embeddingPriceInput: true,
        exchangeRate: true,
        // Speaker detection fields
        speakerCount: true,
        hasSpeakerDiarization: true,
        speakerTranscription: true,
        speakerMetadata: true,
        // Speaker assignments
        transcriptionSpeakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.audioTranscription.count({ where })

    return NextResponse.json({
      transcriptions,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching transcriptions:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch transcriptions' 
    }, { status: 500 })
  }
}
