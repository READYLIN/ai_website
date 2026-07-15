import { NextRequest, NextResponse } from 'next/server';
import type { Article } from '@/lib/types';
import { getStoredArticles } from '@/lib/storage';
import { fetchAllMediaIntel } from '@/lib/media-intel';
import { fetchPEIntel } from '@/lib/pe-intel';
import { buildDigest, buildIntelligenceDigest, filterLast24Hours } from '@/lib/digest';
import { NEWSLETTER_TOPIC_META, NewsletterTopic } from '@/lib/newsletter';
import { resolveButtondownTagId } from '@/lib/buttondown';

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

async function sendTopicDigest(
  topic: NewsletterTopic,
  digest: { subject: string; body: string },
  offsetMinutes: number,
) {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) throw new Error('BUTTONDOWN_API_KEY not configured');

  const tagName = NEWSLETTER_TOPIC_META[topic].tag;
  const tagId = await resolveButtondownTagId(tagName);
  if (!tagId) {
    return { topic, skipped: true, reason: `No Buttondown tag found for ${tagName}` };
  }

  const publishDate = scheduledTime(offsetMinutes);
  const response = await fetch('https://api.buttondown.com/v1/emails', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Buttondown-Live-Dangerously': 'true',
    },
    body: JSON.stringify({
      subject: digest.subject,
      body: digest.body,
      status: 'about_to_send',
      email_type: 'public',
      publish_date: publishDate.toISOString(),
      filters: {
        predicate: 'and',
        filters: [{
          field: 'subscriber.tags',
          operator: 'contains',
          value: tagId,
        }],
        groups: [],
      },
      metadata: { newsletter_topic: topic },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    return { topic, success: false, status: response.status, error };
  }

  const data = await response.json();
  return {
    topic,
    success: true,
    emailId: data.id,
    scheduledFor: publishDate.toISOString(),
  };
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
    console.log('[digest] Total articles in storage:', all.length);
    if (all.length === 0) {
      return NextResponse.json({ message: 'No articles in storage; run /api/storage/sync first' });
    }

    const ai = filterLast24Hours(all);
    const media = mediaResult.status === 'fulfilled' ? filterLast24Hours(mediaResult.value) : [];
    const privateEquity = peResult.status === 'fulfilled' ? filterLast24Hours(peResult.value) : [];

    const jobs: Promise<unknown>[] = [];
    if (ai.length > 0) jobs.push(sendTopicDigest('ai', buildDigest(ai), 0));
    if (media.length > 0) jobs.push(sendTopicDigest('media', buildIntelligenceDigest('media', media), 5));
    if (privateEquity.length > 0) {
      jobs.push(sendTopicDigest(
        'private-equity',
        buildIntelligenceDigest('private-equity', privateEquity),
        10,
      ));
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
