import { Redis } from '@upstash/redis';
import { Article, Paper } from './types';

// ─── Redis Client ─────────────────────────────────────────────

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[storage] Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    return null;
  }

  return new Redis({ url, token });
}

// ─── Month Helpers ────────────────────────────────────────────

function getMonthKey(dateStr: string): string {
  // "2026-07-11T..." → "2026-07"
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTargetMonths(): string[] {
  // Return current month plus previous 2 months (rolling window).
  // Overridable with STORAGE_MONTHS env var (comma-separated).
  const env = process.env.STORAGE_MONTHS;
  if (env) return env.split(',').map(s => s.trim());

  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }
  return months;
}

// ─── Article Storage ──────────────────────────────────────────

export async function saveArticles(articles: Article[]): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  const targetMonths = getTargetMonths();
  let savedCount = 0;

  for (const article of articles) {
    const month = getMonthKey(article.publishedAt);
    if (!targetMonths.includes(month)) continue;

    const key = `articles:${month}`;
    const json = JSON.stringify(article);

    try {
      // HSETNX - only save if not already present (avoids overwriting with same data)
      const added = await redis.hsetnx(key, article.id, json);
      if (added) savedCount++;
    } catch (err) {
      console.error(`[storage] Failed to save article ${article.id}:`, err);
    }
  }

  // Update month index
  if (savedCount > 0) {
    try {
      const monthsWithData = targetMonths.filter(m => articles.some(a => getMonthKey(a.publishedAt) === m));
      for (const month of monthsWithData) {
        await redis.sadd('meta:months:articles', month);
      }
    } catch (err) {
      console.error('[storage] Failed to update month index:', err);
    }
  }

  return savedCount;
}

export async function getStoredArticles(months?: string[]): Promise<Article[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const targetMonths = months || getTargetMonths();
  const articles: Article[] = [];

  for (const month of targetMonths) {
    const key = `articles:${month}`;
    try {
      const hash = await redis.hgetall<Record<string, unknown>>(key);
      if (hash) {
        for (const value of Object.values(hash)) {
          try {
            // @upstash/redis auto-deserializes JSON, so values are already objects
            const article = (typeof value === 'string' ? JSON.parse(value) : value) as Article;
            articles.push(article);
          } catch {
            // skip malformed entries
          }
        }
      }
    } catch (err) {
      console.error(`[storage] Failed to read articles for ${month}:`, err);
    }
  }

  return articles;
}

// ─── Paper Storage ────────────────────────────────────────────

export async function savePapers(papers: Paper[]): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;

  const targetMonths = getTargetMonths();
  let savedCount = 0;

  for (const paper of papers) {
    const month = getMonthKey(paper.publishedAt);
    if (!targetMonths.includes(month)) continue;

    const key = `papers:${month}`;
    const json = JSON.stringify(paper);

    try {
      const added = await redis.hsetnx(key, paper.id, json);
      if (added) savedCount++;
    } catch (err) {
      console.error(`[storage] Failed to save paper ${paper.id}:`, err);
    }
  }

  if (savedCount > 0) {
    try {
      const monthsWithData = targetMonths.filter(m =>
        papers.some(p => getMonthKey(p.publishedAt) === m)
      );
      for (const month of monthsWithData) {
        await redis.sadd('meta:months:papers', month);
      }
    } catch (err) {
      console.error('[storage] Failed to update paper month index:', err);
    }
  }

  return savedCount;
}

export async function getStoredPapers(months?: string[]): Promise<Paper[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  const targetMonths = months || getTargetMonths();
  const papers: Paper[] = [];

  for (const month of targetMonths) {
    const key = `papers:${month}`;
    try {
      const hash = await redis.hgetall<Record<string, unknown>>(key);
      if (hash) {
        for (const value of Object.values(hash)) {
          try {
            // @upstash/redis auto-deserializes JSON, so values are already objects
            const paper = (typeof value === 'string' ? JSON.parse(value) : value) as Paper;
            papers.push(paper);
          } catch {
            // skip malformed entries
          }
        }
      }
    } catch (err) {
      console.error(`[storage] Failed to read papers for ${month}:`, err);
    }
  }

  return papers;
}

// ─── Month Index ──────────────────────────────────────────────

export async function getAvailableMonths(type: 'articles' | 'papers'): Promise<string[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const key = `meta:months:${type}`;
    const members = (await redis.smembers(key)) as string[];
    return members.sort();
  } catch (err) {
    console.error(`[storage] Failed to get available months for ${type}:`, err);
    return [];
  }
}

// ─── Stats ────────────────────────────────────────────────────

export async function getStorageStats(): Promise<{
  articles: { month: string; count: number }[];
  papers: { month: string; count: number }[];
}> {
  const redis = getRedisClient();
  if (!redis) return { articles: [], papers: [] };

  try {
    const articleMonths = await getAvailableMonths('articles');
    const paperMonths = await getAvailableMonths('papers');

    const articleStats = await Promise.all(
      articleMonths.map(async (month) => ({
        month,
        count: await redis.hlen(`articles:${month}`),
      }))
    );

    const paperStats = await Promise.all(
      paperMonths.map(async (month) => ({
        month,
        count: await redis.hlen(`papers:${month}`),
      }))
    );

    return { articles: articleStats, papers: paperStats };
  } catch (err) {
    console.error('[storage] Failed to get stats:', err);
    return { articles: [], papers: [] };
  }
}
