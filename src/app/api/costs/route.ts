import { NextRequest, NextResponse } from 'next/server'
import { getCostSummary, formatCost } from '@/lib/pricing'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // all, today, week, month
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get cost summary
    const costSummary = await getCostSummary()

    // Calculate period-based costs
    let periodFilter = {}
    const now = new Date()
    
    switch (period) {
      case 'today':
        periodFilter = {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        periodFilter = {
          createdAt: {
            gte: weekAgo
          }
        }
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        periodFilter = {
          createdAt: {
            gte: monthAgo
          }
        }
        break
    }

    // Get transcription costs for the period
    const transcriptionCosts = await prisma.audioTranscription.findMany({
      where: periodFilter,
      select: {
        id: true,
        createdAt: true,
        fileName: true,
        inputTokens: true,
        outputTokens: true,
        transcriptionCost: true,
        embeddingCost: true,
        totalCost: true,
        exchangeRate: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get search costs for the period
    const searchCosts = await prisma.searchCost.findMany({
      where: periodFilter,
      select: {
        id: true,
        createdAt: true,
        query: true,
        tokens: true,
        cost: true,
        model: true,
        exchangeRate: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Calculate period totals
    const periodTranscriptionTotal = transcriptionCosts.reduce(
      (sum, t) => sum + (t.totalCost || 0), 0
    )
    const periodSearchTotal = searchCosts.reduce(
      (sum, s) => sum + s.cost, 0
    )

    // Calculate average costs
    const avgTranscriptionCost = transcriptionCosts.length > 0 
      ? periodTranscriptionTotal / transcriptionCosts.length 
      : 0
    const avgSearchCost = searchCosts.length > 0 
      ? periodSearchTotal / searchCosts.length 
      : 0

    // Simplified model breakdown (will be enhanced after field migration)
    const modelBreakdown: {
      model: string | null
      totalCost: number
      inputTokens: number
      outputTokens: number
      requestCount: number
    }[] = []

    return NextResponse.json({
      summary: costSummary,
      period: {
        name: period,
        transcriptionTotal: periodTranscriptionTotal,
        searchTotal: periodSearchTotal,
        grandTotal: periodTranscriptionTotal + periodSearchTotal,
        transcriptionCount: transcriptionCosts.length,
        searchCount: searchCosts.length,
        avgTranscriptionCost,
        avgSearchCost
      },
      recentTranscriptions: transcriptionCosts,
      recentSearches: searchCosts,
      modelBreakdown: modelBreakdown,
      formatted: {
        summary: costSummary ? {
          totalTranscriptionCost: formatCost(costSummary.totalTranscriptionCost),
          totalEmbeddingCost: formatCost(costSummary.totalEmbeddingCost),
          totalSearchCost: formatCost(costSummary.totalSearchCost),
          grandTotal: formatCost(costSummary.grandTotal)
        } : null,
        period: {
          transcriptionTotal: formatCost(periodTranscriptionTotal),
          searchTotal: formatCost(periodSearchTotal),
          grandTotal: formatCost(periodTranscriptionTotal + periodSearchTotal),
          avgTranscriptionCost: formatCost(avgTranscriptionCost),
          avgSearchCost: formatCost(avgSearchCost)
        }
      }
    })

  } catch (error) {
    console.error('Error fetching cost data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch cost data' 
    }, { status: 500 })
  }
}
