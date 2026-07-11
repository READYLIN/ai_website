import { NextRequest, NextResponse } from 'next/server';
import { fetchAllArticles } from '@/lib/fetcher';
import { fetchAllPapers } from '@/lib/paper-fetcher';
import { saveArticles, savePapers, getStorageStats } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [articles, papers] = await Promise.all([
      fetchAllArticles(),
      fetchAllPapers(),
    ]);

    const [articleSaved, paperSaved] = await Promise.all([
      saveArticles(articles),
      savePapers(papers),
    ]);

    const stats = await getStorageStats();

    return NextResponse.json({
      success: true,
      fetched: { articles: articles.length, papers: papers.length },
      saved: { articles: articleSaved, papers: paperSaved },
      stats,
    });
  } catch (error) {
    console.error('Storage sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}