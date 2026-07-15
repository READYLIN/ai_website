import { NextRequest, NextResponse } from 'next/server';
import { fetchLivePapers } from '@/lib/paper-fetcher';
import { fetchMediaArticles } from '@/lib/media-fetcher';
import { fetchAllMediaIntel } from '@/lib/media-intel';
import { fetchPEIntel } from '@/lib/pe-intel';
import { fetchLivePEIntel } from '@/lib/pe-fetcher';
import {
  getStoredIntelligence,
  getStorageStats,
  saveIntelligence,
} from '@/lib/storage';
import { IntelArticle } from '@/lib/types';
import { qualityIssues, sanitizeAndDedupeIntelligence } from '@/lib/intelligence-rules';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function handleSync(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const imported = request.method === 'POST'
      ? await request.json().catch(() => ({})) as {
          media?: IntelArticle[];
          privateEquity?: IntelArticle[];
        }
      : {};

    const [
      papersResult,
      mediaStructuredResult,
      mediaLiveResult,
      peStructuredResult,
      peLiveResult,
      storedMediaResult,
      storedPeResult,
    ] = await Promise.allSettled([
      fetchLivePapers(),
      fetchAllMediaIntel(),
      fetchMediaArticles(),
      fetchPEIntel(),
      fetchLivePEIntel(),
      getStoredIntelligence('media'),
      getStoredIntelligence('private-equity'),
    ]);

    if (papersResult.status === 'rejected') {
      console.error('[sync] Failed to fetch papers:', papersResult.reason);
    }

    const storedMedia = storedMediaResult.status === 'fulfilled' ? storedMediaResult.value : [];
    const storedPrivateEquity = storedPeResult.status === 'fulfilled' ? storedPeResult.value : [];

    const media = sanitizeAndDedupeIntelligence([
      ...(mediaStructuredResult.status === 'fulfilled' ? mediaStructuredResult.value : []),
      ...(mediaLiveResult.status === 'fulfilled' ? mediaLiveResult.value : []),
      ...storedMedia,
      ...(Array.isArray(imported.media) ? imported.media : []),
    ], 'media');
    const privateEquity = sanitizeAndDedupeIntelligence([
      ...(peStructuredResult.status === 'fulfilled' ? peStructuredResult.value : []),
      ...(peLiveResult.status === 'fulfilled' ? peLiveResult.value : []),
      ...storedPrivateEquity,
      ...(Array.isArray(imported.privateEquity) ? imported.privateEquity : []),
    ], 'private-equity');

    const mediaIssues = qualityIssues(media);
    const privateEquityIssues = qualityIssues(privateEquity);
    if (mediaIssues.length || privateEquityIssues.length) {
      throw new Error(`Quality gate failed: media=${mediaIssues.slice(0, 3).join(', ')}; private-equity=${privateEquityIssues.slice(0, 3).join(', ')}`);
    }

    const [mediaSaved, peSaved] = await Promise.all([
      saveIntelligence('media', media),
      saveIntelligence('private-equity', privateEquity),
    ]);

    const stats = await getStorageStats();

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      fetched: {
        papers: papersResult.status === 'fulfilled' ? papersResult.value.length : 0,
        media: media.length,
        privateEquity: privateEquity.length,
      },
      retainedFromStorage: {
        media: storedMedia.length,
        privateEquity: storedPrivateEquity.length,
      },
      saved: {
        media: mediaSaved,
        privateEquity: peSaved,
      },
      quality: {
        mediaIssues: mediaIssues.length,
        privateEquityIssues: privateEquityIssues.length,
      },
      stats,
    });
  } catch (error) {
    console.error('Storage sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
