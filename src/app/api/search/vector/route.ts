import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { VectorService } from '@/lib/vector-service';

const prisma = new PrismaClient();
const vectorService = new VectorService(prisma);

export async function POST(request: NextRequest) {
  try {
    const { query, type = 'hybrid', limit = 10, threshold = 0.7 } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    let results;
    
    switch (type) {
      case 'semantic':
        results = await vectorService.searchTranscriptions(query, limit, threshold);
        break;
      case 'knowledge':
        results = await vectorService.searchKnowledge(query, limit, threshold);
        break;
      case 'hybrid':
        results = await vectorService.hybridSearch(query, limit);
        break;
      case 'cached':
        results = await vectorService.getCachedSearch(query);
        break;
      default:
        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
    }

    return NextResponse.json({
      query,
      type,
      results: results || [],
      count: Array.isArray(results) ? results.length : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'hybrid';
    const limit = parseInt(searchParams.get('limit') || '10');
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    let results;
    
    switch (type) {
      case 'semantic':
        results = await vectorService.searchTranscriptions(query, limit, threshold);
        break;
      case 'knowledge':
        results = await vectorService.searchKnowledge(query, limit, threshold);
        break;
      case 'hybrid':
        results = await vectorService.hybridSearch(query, limit);
        break;
      case 'cached':
        results = await vectorService.getCachedSearch(query);
        break;
      default:
        return NextResponse.json({ error: 'Invalid search type' }, { status: 400 });
    }

    return NextResponse.json({
      query,
      type,
      results: results || [],
      count: Array.isArray(results) ? results.length : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vector search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
