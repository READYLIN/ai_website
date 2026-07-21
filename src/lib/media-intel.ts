import { readFileSync, existsSync } from 'fs';
import { IntelArticle } from './types';
import path from 'path';
import { sanitizeAndDedupeIntelligence, extractBestPublishedAt } from './intelligence-rules';
import { withTtlCache } from './feed-utils';
import { getCachedMediaIntelligence } from './cached-storage';
import { searchNonListedInArticles } from './non-listed-search';
import { fetchNonListedDoubaoIntel } from './non-listed-doubao';

// Try project-local data directory first (works in Vercel), fallback to absolute path
const DATA_DIR = path.join(process.cwd(), 'data');

const MEDIA_DAILY_LOCAL = path.join(DATA_DIR, 'media-intel.json');
const MEDIA_WEEKLY_LOCAL = path.join(DATA_DIR, 'media-weekly.json');

const WORKSPACE_ROOT = process.env.INTELLIGENCE_WORKSPACE_ROOT || path.resolve(process.cwd(), '..');
const MEDIA_DAILY_EXTERNAL = process.env.MEDIA_INTEL_PATH || path.join(
  WORKSPACE_ROOT,
  'media_weekly_automation',
  'competitive_intel_last_report.json',
);
const MEDIA_WEEKLY_EXTERNAL = process.env.MEDIA_WEEKLY_PATH || path.join(
  WORKSPACE_ROOT,
  'media_weekly_automation',
  'last_report.json',
);

function resolvePath(local: string, abs: string): string {
  if (existsSync(local)) return local;
  if (existsSync(abs)) return abs;
  return local; // default to local (will fail gracefully)
}

interface MediaDailyItem {
  title: string;
  url: string;
  source: string;
  published: string;
  summary: string;
  company: string;
  company_group: string;
  priority: string;
  dimension: string;
  matrix_label: string;
  channel: string;
}

interface MediaWeeklySource {
  title: string;
  url: string;
}

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'md-' + Math.abs(h).toString(16).slice(0, 12);
}

/**
 * Read daily media intelligence report from external project.
 */
export function fetchMediaIntelLocal(): IntelArticle[] {
  try {
    const raw = readFileSync(resolvePath(MEDIA_DAILY_LOCAL, MEDIA_DAILY_EXTERNAL), 'utf-8');
    const data = JSON.parse(raw);
    const items: MediaDailyItem[] = data.items || [];

    const generatedAt = (data.generatedAt || data.generated_at) as string | undefined;

    return items.map((item) => {
      const bestPublishedAt = extractBestPublishedAt(
        {
          published: item.published,
          url: item.url,
          title: item.title,
          generatedAt,
        },
        generatedAt,
      );
      return {
        id: hashId(item.url || item.title),
        title: item.title || '',
        description: item.summary || '',
        url: item.url || '',
        source: item.source || '',
        categories: [item.company_group || '传媒', item.dimension || ''].filter(Boolean),
        publishedAt: bestPublishedAt || '',
        author: item.company || '',
        company: item.company || '',
        companyGroup: item.company_group || '',
        priority: item.priority || '',
        dimension: item.dimension || '',
        matrixLabel: item.matrix_label || '',
      };
    });
  } catch (err) {
    console.error('[media-intel] Failed to read daily report:', err);
    return [];
  }
}

/**
 * Read weekly media intelligence sources (fallback).
 */
export function fetchMediaWeeklySources(): IntelArticle[] {
  try {
    const raw = readFileSync(resolvePath(MEDIA_WEEKLY_LOCAL, MEDIA_WEEKLY_EXTERNAL), 'utf-8');
    const data = JSON.parse(raw);
    const sources: MediaWeeklySource[] = data.sources || [];

    return sources.map((s) => ({
      id: hashId(s.url || s.title),
      title: s.title || '',
      description: '',
      url: s.url || '',
      source: '',
      categories: ['传媒周报'],
      publishedAt: extractBestPublishedAt({ url: s.url, title: s.title }) || '',
      author: '',
    }));
  } catch (err) {
    console.error('[media-intel] Failed to read weekly report:', err);
    return [];
  }
}

/**
 * Merge daily and weekly data, deduplicate by URL.
 */
const fetchAllMediaIntelCached = withTtlCache(async (): Promise<IntelArticle[]> => {
  const daily = fetchMediaIntelLocal();
  const stored = await getCachedMediaIntelligence().catch(() => []);
  // 在已有的 daily+stored 快照上做非上市提及检索，避免再触发一次全量 RSS 实时抓取
  // （cron 已把 fetchMediaArticles 结果写入 stored 快照并经 unstable_cache 持久缓存，
  // 重复抓取既慢又在 Vercel 冷启动 lambda 上每次必跑，是媒体板块远慢于其他板块的根因）。
  const nonListedRss = searchNonListedInArticles([...daily, ...stored]);
  const nonListedDoubao = await fetchNonListedDoubaoIntel().catch(() => []);
  return sanitizeAndDedupeIntelligence(
    [...daily, ...stored, ...nonListedRss, ...nonListedDoubao],
    'media',
  );
}, 60 * 1000);

export async function fetchAllMediaIntel(): Promise<IntelArticle[]> {
  return fetchAllMediaIntelCached();
}

/**
 * Get available company groups for filtering.
 */
export function getMediaGroups(all: IntelArticle[]): string[] {
  const groups = new Set(all.map((a) => a.companyGroup).filter(Boolean));
  return Array.from(groups).sort() as string[];
}
