import { NextRequest, NextResponse } from 'next/server';
import { fetchAllArticles } from '@/lib/fetcher';
import { sendButtondownPost } from '@/lib/buttondown';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allArticles = await fetchAllArticles();

    if (allArticles.length === 0) {
      return NextResponse.json({ message: 'No articles to send' });
    }

    const { buildDigest, filterLast24Hours } = await import('@/lib/digest');
    const todayArticles = filterLast24Hours(allArticles);

    // Use today's articles if available, otherwise use all articles
    const articles = todayArticles.length > 0 ? todayArticles : allArticles;

    const { subject, body } = buildDigest(articles);

    const result = await sendButtondownPost('ai', subject, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, emailId: result.postId, topic: 'ai' });
  } catch (error) {
    console.error('Digest error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
