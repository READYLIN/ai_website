import { NextRequest, NextResponse } from 'next/server';
import { searchAll } from '@/lib/search-index';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (!q.trim()) {
    return NextResponse.json({ results: [], total: 0 });
  }

  try {
    const results = await searchAll(q.trim(), Math.min(limit, 100));
    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error('[search] error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
