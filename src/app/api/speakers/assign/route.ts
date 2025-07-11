import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateEmbedding } from '@/lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { transcriptionId, assignments } = await request.json()
    
    if (!transcriptionId || !assignments || !Array.isArray(assignments)) {
      return NextResponse.json({ 
        error: 'transcriptionId and assignments array are required' 
      }, { status: 400 })
    }

    // Validate that transcription exists
    const transcription = await prisma.audioTranscription.findUnique({
      where: { id: transcriptionId },
      include: {
        transcriptionSpeakers: true
      }
    })

    if (!transcription) {
      return NextResponse.json({ 
        error: 'Transcription not found' 
      }, { status: 404 })
    }

    // Process each assignment
    const results = []
    for (const assignment of assignments) {
      const { detectedSpeakerLabel, speakerId, confidence } = assignment
      
      if (!detectedSpeakerLabel) {
        continue
      }

      // Create or update TranscriptionSpeaker
      const transcriptionSpeaker = await prisma.transcriptionSpeaker.upsert({
        where: {
          transcriptionId_detectedSpeakerLabel: {
            transcriptionId,
            detectedSpeakerLabel
          }
        },
        update: {
          speakerId: speakerId || null,
          confidence: confidence || null,
          updatedAt: new Date()
        },
        create: {
          transcriptionId,
          detectedSpeakerLabel,
          speakerId: speakerId || null,
          confidence: confidence || null
        },
        include: {
          speaker: true
        }
      })

      results.push(transcriptionSpeaker)
    }

    // If we have speaker assignments, regenerate embeddings with speaker context
    if (results.some(r => r.speakerId)) {
      await regenerateEmbeddingsWithSpeakerContext(transcriptionId)
    }

    return NextResponse.json({
      message: 'Speaker assignments updated successfully',
      assignments: results
    })

  } catch (error) {
    console.error('Error assigning speakers:', error)
    return NextResponse.json({ 
      error: 'Failed to assign speakers' 
    }, { status: 500 })
  }
}

async function regenerateEmbeddingsWithSpeakerContext(transcriptionId: string) {
  try {
    // Get transcription with speaker assignments
    const transcription = await prisma.audioTranscription.findUnique({
      where: { id: transcriptionId },
      include: {
        transcriptionSpeakers: {
          include: {
            speaker: true
          }
        }
      }
    })

    if (!transcription) return

    // Create enhanced text with speaker context
    let enhancedText = transcription.originalText
    
    // Add speaker context if we have assignments
    const speakerContext = transcription.transcriptionSpeakers
      .filter(ts => ts.speaker)
      .map(ts => `${ts.detectedSpeakerLabel} is ${ts.speaker!.name}`)
      .join(', ')

    if (speakerContext) {
      enhancedText = `Speakers: ${speakerContext}. Content: ${transcription.originalText}`
    }

    // Generate new embedding with speaker context
    const embeddingResult = await generateEmbedding(enhancedText, transcription.embeddingModel || 'text-embedding-004')
    
    // Update the transcription with new embedding
    await prisma.audioTranscription.update({
      where: { id: transcriptionId },
      data: {
        embedding: JSON.stringify(embeddingResult.embedding)
      }
    })

    console.log(`Regenerated embeddings for transcription ${transcriptionId} with speaker context`)
  } catch (error) {
    console.error('Error regenerating embeddings:', error)
  }
}
