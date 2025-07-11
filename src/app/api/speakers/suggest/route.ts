import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId } = await request.json()
    
    if (!transcriptionId) {
      return NextResponse.json({ 
        error: 'transcriptionId is required' 
      }, { status: 400 })
    }

    // Get the transcription with unassigned speakers
    const transcription = await prisma.audioTranscription.findUnique({
      where: { id: transcriptionId },
      include: {
        transcriptionSpeakers: {
          where: {
            speakerId: null // Only get unassigned speakers
          }
        }
      }
    })

    if (!transcription) {
      return NextResponse.json({ 
        error: 'Transcription not found' 
      }, { status: 404 })
    }

    const suggestions: Record<string, Array<{
      speakerId: string
      speakerName: string
      confidence: number
      reason: string
    }>> = {}

    // Get all existing speakers with their transcription history
    const speakers = await prisma.speaker.findMany({
      include: {
        transcriptionSpeakers: {
          include: {
            transcription: {
              select: {
                id: true,
                originalText: true,
                tags: true,
                createdAt: true,
                fileName: true
              }
            }
          }
        }
      }
    })

    // Generate suggestions for each unassigned speaker
    for (const ts of transcription.transcriptionSpeakers) {
      const speakerSuggestions = await generateSpeakerSuggestions(
        ts.detectedSpeakerLabel,
        transcription,
        speakers
      )
      
      if (speakerSuggestions.length > 0) {
        suggestions[ts.detectedSpeakerLabel] = speakerSuggestions
      }
    }

    return NextResponse.json({
      suggestions
    })

  } catch (error) {
    console.error('Error generating speaker suggestions:', error)
    return NextResponse.json({ 
      error: 'Failed to generate speaker suggestions' 
    }, { status: 500 })
  }
}

interface TranscriptionData {
  id: string
  fileName?: string | null
  tags: string[]
  originalText: string
  createdAt: string | Date
}

interface SpeakerData {
  id: string
  name: string
  transcriptionSpeakers: Array<{
    detectedSpeakerLabel: string
    transcription: TranscriptionData
  }>
}

async function generateSpeakerSuggestions(
  detectedSpeakerLabel: string,
  currentTranscription: TranscriptionData,
  speakers: SpeakerData[]
): Promise<Array<{
  speakerId: string
  speakerName: string
  confidence: number
  reason: string
}>> {
  const suggestions = []
  
  // Strategy 1: Tag similarity
  if (currentTranscription.tags && currentTranscription.tags.length > 0) {
    for (const speaker of speakers) {
      const commonTags = speaker.transcriptionSpeakers
        .flatMap((ts) => ts.transcription.tags || [])
        .filter((tag: string) => currentTranscription.tags.includes(tag))
      
      if (commonTags.length > 0) {
        const confidence = Math.min(0.9, commonTags.length * 0.3)
        suggestions.push({
          speakerId: speaker.id,
          speakerName: speaker.name,
          confidence,
          reason: `Shares ${commonTags.length} tag(s): ${commonTags.slice(0, 2).join(', ')}`
        })
      }
    }
  }

  // Strategy 2: Filename pattern similarity
  const currentBaseName = currentTranscription.fileName?.replace(/\.[^/.]+$/, "").toLowerCase()
  if (currentBaseName) {
    for (const speaker of speakers) {
      const similarFiles = speaker.transcriptionSpeakers
        .filter((ts) => {
          const baseName = ts.transcription.fileName?.replace(/\.[^/.]+$/, "").toLowerCase()
          return baseName && (
            baseName.includes(currentBaseName) || 
            currentBaseName.includes(baseName) ||
            baseName.split(/[_\-\s]/).some((part: string) => 
              currentBaseName.split(/[_\-\s]/).includes(part) && part.length > 3
            )
          )
        })
      
      if (similarFiles.length > 0) {
        const confidence = Math.min(0.8, similarFiles.length * 0.4)
        suggestions.push({
          speakerId: speaker.id,
          speakerName: speaker.name,
          confidence,
          reason: `Similar filename patterns (${similarFiles.length} matches)`
        })
      }
    }
  }

  // Strategy 3: Recent activity
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  for (const speaker of speakers) {
    const recentTranscriptions = speaker.transcriptionSpeakers
      .filter((ts) => new Date(ts.transcription.createdAt) > oneDayAgo)
    
    if (recentTranscriptions.length > 0) {
      const confidence = Math.min(0.7, recentTranscriptions.length * 0.3)
      suggestions.push({
        speakerId: speaker.id,
        speakerName: speaker.name,
        confidence,
        reason: `Recent activity (${recentTranscriptions.length} transcriptions today)`
      })
    }
  }

  // Strategy 4: Frequency of use
  for (const speaker of speakers) {
    const transcriptionCount = speaker.transcriptionSpeakers.length
    if (transcriptionCount >= 3) {
      const confidence = Math.min(0.6, transcriptionCount * 0.05)
      suggestions.push({
        speakerId: speaker.id,
        speakerName: speaker.name,
        confidence,
        reason: `Frequently used speaker (${transcriptionCount} transcriptions)`
      })
    }
  }

  // Strategy 5: Same speaker position pattern
  const speakerNumber = detectedSpeakerLabel.match(/\d+/)?.[0]
  if (speakerNumber) {
    for (const speaker of speakers) {
      const samePositionCount = speaker.transcriptionSpeakers
        .filter((ts) => ts.detectedSpeakerLabel === detectedSpeakerLabel)
        .length
      
      if (samePositionCount > 0) {
        const confidence = Math.min(0.85, samePositionCount * 0.3)
        suggestions.push({
          speakerId: speaker.id,
          speakerName: speaker.name,
          confidence,
          reason: `Often appears as ${detectedSpeakerLabel} (${samePositionCount} times)`
        })
      }
    }
  }

  // Deduplicate and sort by confidence
  const uniqueSuggestions = suggestions.reduce((acc, current) => {
    const existing = acc.find(item => item.speakerId === current.speakerId)
    if (existing) {
      // Combine confidences (take maximum, add bonus for multiple reasons)
      existing.confidence = Math.min(0.95, Math.max(existing.confidence, current.confidence) + 0.1)
      existing.reason = `${existing.reason} & ${current.reason}`
    } else {
      acc.push(current)
    }
    return acc
  }, [] as typeof suggestions)

  // Return top 3 suggestions with confidence > 0.5
  return uniqueSuggestions
    .filter(s => s.confidence > 0.5)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
}
