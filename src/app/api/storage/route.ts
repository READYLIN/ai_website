import { NextRequest, NextResponse } from 'next/server';
import { getStoredArticles, getStoredPapers, getAvailableMonths } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');  // 'articles' | 'papers'
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
  if (!type || !['articles', 'papers'].includes(type)) {
    return NextResponse.json(
      { error: 'Missing or invalid "type" param. Use "articles" or "papers".' },
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
    } else {
      const papers = await getStoredPapers(months);
      return NextResponse.json({ papers, count: papers.length });
    }
  } catch (error) {
    console.error('Storage fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}