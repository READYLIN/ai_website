import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '@/lib/types';
import { getStoredArticles, getRedisClient } from '@/lib/storage';
import { fetchAllMediaIntel } from '@/lib/media-intel';
import { fetchPEIntel } from '@/lib/pe-intel';
import { buildDigest, buildIntelligenceDigest, filterLast24Hours } from '@/lib/digest';
import { NEWSLETTER_TOPIC_META, NewsletterTopic } from '@/lib/newsletter';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

function scheduledTime(offsetMinutes: number): Date {
  const now = new Date();
  return now;
}

async function saveDraft(topic: NewsletterTopic, digest: { subject: string; body: string }) {
  const redis = getRedisClient();
  if (!redis) return { topic, saved: false, reason: 'no redis' };
  try {
    await redis.set(`digest:draft:${topic}`, JSON.stringify({
      subject: digest.subject,
      body: digest.body,
      savedAt: new Date().toISOString(),
    }));
    return { topic, saved: true };
  } catch (err) {
    console.error(`[digest] Failed to save draft for ${topic}:`, err);
    return { topic, saved: false, reason: (err as Error).message };
  }
}

async function handleDigest() {
  if (!process.env.BUTTONDOWN_API_KEY) {
    return NextResponse.json({ error: 'BUTTONDOWN_API_KEY not configured' }, { status: 500 });
  }

  try {
    const [aiResult, mediaResult, peResult] = await Promise.allSettled([
      getStoredArticles(),
      fetchAllMediaIntel(),
      fetchPEIntel(),
    ]);

    if (aiResult.status === 'rejected') {
      console.error('[digest] Failed to read articles from storage:', aiResult.reason);
      return NextResponse.json({ error: 'Storage read failed' }, { status: 500 });
    }
    if (mediaResult.status === 'rejected') {
      console.error('[digest] Failed to fetch media intel:', mediaResult.reason);
    }
    if (peResult.status === 'rejected') {
      console.error('[digest] Failed to fetch PE intel:', peResult.reason);
    }

    const all = aiResult.value as Article[];
    if (all.length === 0) {
      return NextResponse.json({ message: 'No articles in storage; run /api/storage/sync first' });
    }

    // Drop large fields before filtering to save memory
    const lightArticles: Article[] = all.map(a => ({
      ...a,
      content: '',
      contentZh: '',
    }));

    const ai = filterLast24Hours(lightArticles);
    const media = mediaResult.status === 'fulfilled' ? filterLast24Hours(mediaResult.value) : [];
    const privateEquity = peResult.status === 'fulfilled' ? filterLast24Hours(peResult.value) : [];

    const jobs: Promise<unknown>[] = [];
    if (ai.length > 0) {
      const digest = buildDigest(ai);
      jobs.push(saveDraft('ai', digest));
    }
    if (media.length > 0) {
      const digest = buildIntelligenceDigest('media', media);
      jobs.push(saveDraft('media', digest));
    }
    if (privateEquity.length > 0) {
      const digest = buildIntelligenceDigest('private-equity', privateEquity);
      jobs.push(saveDraft('private-equity', digest));
    }

    if (jobs.length === 0) {
      return NextResponse.json({ message: 'No new content in the last 24 hours; nothing sent' });
    }

    const results = await Promise.all(jobs);
    const failed = results.some((result) => (
      typeof result === 'object' && result !== null && 'success' in result && result.success === false
    ));

    return NextResponse.json({
      success: !failed,
      content: { ai: ai.length, media: media.length, privateEquity: privateEquity.length },
      deliveries: results,
    }, { status: failed ? 502 : 200 });
  } catch (error) {
    console.error('Digest cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleDigest();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleDigest();
}
