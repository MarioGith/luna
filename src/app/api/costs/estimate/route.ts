import { NextRequest, NextResponse } from 'next/server'
import { getExchangeRate, estimateTranscriptionCost } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const { fileSizeBytes, transcriptionModel, embeddingModel } = await request.json()
    
    if (!fileSizeBytes || !transcriptionModel || !embeddingModel) {
      return NextResponse.json({ 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Get current exchange rate
    const exchangeRate = await getExchangeRate()
    
    // Calculate cost estimate
    const estimate = estimateTranscriptionCost(
      fileSizeBytes,
      transcriptionModel,
      embeddingModel,
      exchangeRate
    )

    return NextResponse.json({
      ...estimate,
      exchangeRate
    })

  } catch (error) {
    console.error('Error calculating cost estimate:', error)
    return NextResponse.json({ 
      error: 'Failed to calculate cost estimate' 
    }, { status: 500 })
  }
}
