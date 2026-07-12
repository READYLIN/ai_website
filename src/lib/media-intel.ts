import { readFileSync } from 'fs';
import { IntelArticle } from './types';

const MEDIA_DAILY_REPORT =
  '/Users/z1/Documents/New project/media_weekly_automation/competitive_intel_last_report.json';

const MEDIA_WEEKLY_SOURCES =
  '/Users/z1/Documents/New project/media_weekly_automation/last_report.json';

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
export function fetchMediaIntel(): IntelArticle[] {
  try {
    const raw = readFileSync(MEDIA_DAILY_REPORT, 'utf-8');
    const data = JSON.parse(raw);
    const items: MediaDailyItem[] = data.items || [];

    return items.map((item) => ({
      id: hashId(item.url || item.title),
      title: item.title || '',
      description: item.summary || '',
      url: item.url || '',
      source: item.source || '',
      categories: [item.company_group || '传媒', item.dimension || ''].filter(Boolean),
      publishedAt: item.published
        ? new Date(item.published).toISOString()
        : new Date().toISOString(),
      author: item.company || '',
      company: item.company || '',
      companyGroup: item.company_group || '',
      priority: item.priority || '',
      dimension: item.dimension || '',
      matrixLabel: item.matrix_label || '',
    }));
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
    const raw = readFileSync(MEDIA_WEEKLY_SOURCES, 'utf-8');
    const data = JSON.parse(raw);
    const sources: MediaWeeklySource[] = data.sources || [];

    return sources.map((s) => ({
      id: hashId(s.url || s.title),
      title: s.title || '',
      description: '',
      url: s.url || '',
      source: '',
      categories: ['传媒周报'],
      publishedAt: new Date().toISOString(),
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
export function fetchAllMediaIntel(): IntelArticle[] {
  const daily = fetchMediaIntel();
  const weekly = fetchMediaWeeklySources();

  const seen = new Set(daily.map((a) => a.url));
  const merged = [...daily];

  for (const item of weekly) {
    if (!seen.has(item.url)) {
      seen.add(item.url);
      merged.push(item);
    }
  }

  merged.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return merged;
}

/**
 * Get available company groups for filtering.
 */
export function getMediaGroups(): string[] {
  const all = fetchMediaIntel();
  const groups = new Set(all.map((a) => a.companyGroup).filter(Boolean));
  return Array.from(groups).sort() as string[];
}