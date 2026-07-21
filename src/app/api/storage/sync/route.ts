import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveArticles } from '@/lib/fetcher';
import { fetchLivePapers } from '@/lib/paper-fetcher';
import { fetchMediaArticles } from '@/lib/media-fetcher';
import { fetchAllMediaIntel } from '@/lib/media-intel';
import { fetchPEIntel } from '@/lib/pe-intel';
import { fetchLivePEIntel } from '@/lib/pe-fetcher';
import {
  getStoredIntelligence,
  getStorageStats,
  mergeArticleListSnapshot,
  mergeIntelligenceListSnapshot,
  mergePaperListSnapshot,
  pruneIntelligence,
  replaceIntelligenceListSnapshot,
  saveArticles,
  saveIntelligence,
  savePapers,
} from '@/lib/storage';
import { IntelArticle } from '@/lib/types';
import { qualityIssues, sanitizeAndDedupeIntelligence } from '@/lib/intelligence-rules';
import { keepTrackedPrivateEquityCompanies } from '@/lib/private-equity-companies';
import { syncNonListedDoubaoToCloud } from '@/lib/non-listed-doubao';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

async function handleSync(request: NextRequest, debugMode?: boolean) {
  if (!debugMode && !isAuthorized(request)) {
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
      articlesResult,
      papersResult,
      mediaStructuredResult,
      mediaLiveResult,
      peStructuredResult,
      peLiveResult,
      storedMediaResult,
      storedPeResult,
    ] = await Promise.allSettled([
      fetchLiveArticles(),
      fetchLivePapers(),
      fetchAllMediaIntel(),
      fetchMediaArticles(),
      fetchPEIntel(),
      fetchLivePEIntel(),
      getStoredIntelligence('media'),
      getStoredIntelligence('private-equity'),
    ]);

    const articles = articlesResult.status === 'fulfilled' ? articlesResult.value : [];
    if (articlesResult.status === 'rejected') {
      console.error('[sync] Failed to fetch articles:', articlesResult.reason);
    }
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
    const privateEquity = sanitizeAndDedupeIntelligence(keepTrackedPrivateEquityCompanies([
      ...(peStructuredResult.status === 'fulfilled' ? peStructuredResult.value : []),
      ...(peLiveResult.status === 'fulfilled' ? peLiveResult.value : []),
      ...storedPrivateEquity,
      ...(Array.isArray(imported.privateEquity) ? imported.privateEquity : []),
    ]), 'private-equity');

    const mediaIssues = qualityIssues(media);
    const privateEquityIssues = qualityIssues(privateEquity);
    if (mediaIssues.length || privateEquityIssues.length) {
      throw new Error(`Quality gate failed: media=${mediaIssues.slice(0, 3).join(', ')}; private-equity=${privateEquityIssues.slice(0, 3).join(', ')}`);
    }

    const pePruned = await pruneIntelligence(
      'private-equity',
      new Set(privateEquity.map(article => article.id)),
    );

    const [articleSaved, paperSaved, mediaSaved, peSaved] = await Promise.all([
      saveArticles(articles),
      savePapers(papersResult.status === 'fulfilled' ? papersResult.value : []),
      saveIntelligence('media', media),
      saveIntelligence('private-equity', privateEquity),
    ]);

    await Promise.all([
      mergeArticleListSnapshot(articles),
      mergePaperListSnapshot(papersResult.status === 'fulfilled' ? papersResult.value : []),
      mergeIntelligenceListSnapshot('media', media),
      replaceIntelligenceListSnapshot('private-equity', privateEquity),
    ]);

    // Make the next page request and digest read the just-synced cloud data.
    // Full route output remains fast, while scheduled syncs do not wait for the
    // normal five-minute cache window to expire.
    revalidateTag('cloud-storage-articles');
    revalidateTag('cloud-storage-papers');
    revalidateTag('cloud-storage-intelligence-media');
    revalidateTag('cloud-storage-intelligence-private-equity');

    const stats = await getStorageStats();

    // 非上市公司「豆包补充」增量抓取：在主同步存盘之后执行，失败不影响主数据。
    let nonListedDoubao: Awaited<ReturnType<typeof syncNonListedDoubaoToCloud>> | null = null;
    try {
      nonListedDoubao = await syncNonListedDoubaoToCloud();
    } catch (e) {
      console.error('[sync] non-listed doubao step failed:', e);
    }

    const resp: Record<string, unknown> = {
      success: true,
      syncedAt: new Date().toISOString(),
      fetched: {
        articles: articles.length,
        papers: papersResult.status === 'fulfilled' ? papersResult.value.length : 0,
        media: media.length,
        privateEquity: privateEquity.length,
      },
      retainedFromStorage: {
        media: storedMediaResult.status === 'fulfilled' ? storedMediaResult.value.length : 0,
        privateEquity: storedPeResult.status === 'fulfilled' ? storedPeResult.value.length : 0,
      },
      saved: {
        articles: articleSaved,
        papers: paperSaved,
        media: mediaSaved,
        privateEquity: peSaved,
      },
      pruned: {
        privateEquity: pePruned,
      },
      quality: {
        mediaIssues: mediaIssues.length,
        privateEquityIssues: privateEquityIssues.length,
      },
      nonListedDoubao,
      stats,
    };
    if (debugMode) resp.debug = true;
    return NextResponse.json(resp);
  } catch (error) {
    console.error('Storage sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const debug = request.nextUrl.searchParams.get('debug');
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return handleSync(request, debug === '1');
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
