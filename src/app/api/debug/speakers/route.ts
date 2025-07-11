import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all speakers with their transcription counts
    const speakers = await prisma.speaker.findMany({
      include: {
        _count: {
          select: { transcriptionSpeakers: true }
        },
        transcriptionSpeakers: {
          include: {
            transcription: {
              select: {
                id: true,
                fileName: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    // Also get count from different approach
    const speakerCount = await prisma.speaker.count();
    
    return NextResponse.json({
      totalSpeakers: speakerCount,
      speakers: speakers.map(speaker => ({
        id: speaker.id,
        name: speaker.name,
        createdAt: speaker.createdAt,
        transcriptionCount: speaker._count.transcriptionSpeakers,
        transcriptions: speaker.transcriptionSpeakers.map(ts => ({
          id: ts.transcription.id,
          fileName: ts.transcription.fileName,
          createdAt: ts.transcription.createdAt
        }))
      }))
    });
  } catch (error) {
    console.error('Debug API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data', details: error },
      { status: 500 }
    );
  }
}
