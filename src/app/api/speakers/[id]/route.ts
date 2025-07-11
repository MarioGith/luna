import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const speaker = await prisma.speaker.findUnique({
      where: { id },
      include: {
        transcriptionSpeakers: {
          include: {
            transcription: {
              select: {
                id: true,
                fileName: true,
                createdAt: true,
                originalText: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            transcriptionSpeakers: true
          }
        }
      }
    })

    if (!speaker) {
      return NextResponse.json({ 
        error: 'Speaker not found' 
      }, { status: 404 })
    }

    return NextResponse.json(speaker)

  } catch (error) {
    console.error('Error fetching speaker:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch speaker' 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ 
        error: 'Name is required and must be a string' 
      }, { status: 400 })
    }

    // Check if another speaker with this name exists
    const existingSpeaker = await prisma.speaker.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        },
        id: {
          not: id
        }
      }
    })

    if (existingSpeaker) {
      return NextResponse.json({ 
        error: 'Speaker with this name already exists' 
      }, { status: 409 })
    }

    const speaker = await prisma.speaker.update({
      where: { id },
      data: {
        name: name.trim()
      },
      include: {
        _count: {
          select: {
            transcriptionSpeakers: true
          }
        }
      }
    })

    return NextResponse.json(speaker)

  } catch (error) {
    console.error('Error updating speaker:', error)
    return NextResponse.json({ 
      error: 'Failed to update speaker' 
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  try {
    // Check if speaker exists
    const speaker = await prisma.speaker.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            transcriptionSpeakers: true
          }
        }
      }
    })

    if (!speaker) {
      return NextResponse.json({ 
        error: 'Speaker not found' 
      }, { status: 404 })
    }

    // Delete the speaker (transcriptionSpeakers will be set to null due to onDelete: SetNull)
    await prisma.speaker.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: 'Speaker deleted successfully',
      unassignedCount: speaker._count.transcriptionSpeakers
    })

  } catch (error) {
    console.error('Error deleting speaker:', error)
    return NextResponse.json({ 
      error: 'Failed to delete speaker' 
    }, { status: 500 })
  }
}
