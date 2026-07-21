import { NextRequest, NextResponse } from 'next/server';
import { getStoredArticles, getStoredIntelligence, getStoredPapers, getAvailableMonths } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');  // 'articles' | 'papers' | intelligence channels
  const monthsParam = searchParams.get('months');  // comma-separated, e.g. '2026-06,2026-07'
  const path = searchParams.get('path');  // 'months' for listing available months

  // ─── List available months ──────────────────────────────────
  if (path === 'months') {
    try {
      const [articleMonths, paperMonths] = await Promise.all([
        getAvailableMonths('articles'),
        getAvailableMonths('papers'),
      ]);
      return NextResponse.json({ articles: articleMonths, papers: paperMonths });
    } catch (error) {
      console.error('Storage months fetch error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // ─── Query stored data ──────────────────────────────────────
  if (!type || !['articles', 'papers', 'media', 'private-equity'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid "type". Use articles, papers, media, or private-equity.' },
      { status: 400 }
    );
  }

  const months = monthsParam
    ? monthsParam.split(',').map((s) => s.trim())
    : undefined;

  try {
    if (type === 'articles') {
      const articles = await getStoredArticles(months);
      return NextResponse.json({ articles, count: articles.length });
    } else if (type === 'papers') {
      const papers = await getStoredPapers(months);
      return NextResponse.json({ papers, count: papers.length });
    } else {
      const channel = type === 'media' ? 'media' : 'private-equity';
      const intelligence = await getStoredIntelligence(channel);
      return NextResponse.json({ intelligence, count: intelligence.length, channel });
    }
  } catch (error) {
    console.error('Storage fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
