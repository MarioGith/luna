import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = search ? {
      name: {
        contains: search,
        mode: 'insensitive' as const
      }
    } : {}

    const speakers = await prisma.speaker.findMany({
      where,
      include: {
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
        },
        _count: {
          select: {
            transcriptionSpeakers: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.speaker.count({ where })

    return NextResponse.json({
      speakers,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching speakers:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch speakers' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ 
        error: 'Name is required and must be a string' 
      }, { status: 400 })
    }

    // Check if speaker already exists
    const existingSpeaker = await prisma.speaker.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingSpeaker) {
      return NextResponse.json({ 
        error: 'Speaker with this name already exists' 
      }, { status: 409 })
    }

    const speaker = await prisma.speaker.create({
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
    console.error('Error creating speaker:', error)
    return NextResponse.json({ 
      error: 'Failed to create speaker' 
    }, { status: 500 })
  }
}
