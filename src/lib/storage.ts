import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { Article, IntelligenceChannel, IntelArticle, Paper, SubscriberRecord } from './types';
import { NewsletterTopic } from './newsletter';

// ─── Redis Client ─────────────────────────────────────────────

export function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[storage] Upstash Redis not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
    return null;
  }

  return new Redis({ url, token });
}

export function isCloudStorageConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
      // Auto-expire after 90 days
      redis.expire(key, 90 * 86400).catch(() => {});
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

  // Limit to current month only to reduce memory pressure on Vercel serverless
  const targetMonths = months || [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`];
  const batches = await Promise.all(targetMonths.map(async (month) => {
    try {
      const hash = await redis.hgetall<Record<string, unknown>>(`articles:${month}`);
      if (!hash) return [] as Article[];
      return Object.values(hash).flatMap((value) => {
        try {
          return [(typeof value === 'string' ? JSON.parse(value) : value) as Article];
        } catch {
          return [];
        }
      });
    } catch (err) {
      console.error(`[storage] Failed to read articles for ${month}:`, err);
      return [] as Article[];
    }
  }));

  return batches.flat();
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
  const batches = await Promise.all(targetMonths.map(async (month) => {
    try {
      const hash = await redis.hgetall<Record<string, unknown>>(`papers:${month}`);
      if (!hash) return [] as Paper[];
      return Object.values(hash).flatMap((value) => {
        try {
          return [(typeof value === 'string' ? JSON.parse(value) : value) as Paper];
        } catch {
          return [];
        }
      });
    } catch (err) {
      console.error(`[storage] Failed to read papers for ${month}:`, err);
      return [] as Paper[];
    }
  }));

  return batches.flat();
}

// ─── Structured intelligence storage ─────────────────────────

export async function saveIntelligence(
  channel: IntelligenceChannel,
  articles: IntelArticle[],
): Promise<number> {
  const redis = getRedisClient();
  if (!redis || articles.length === 0) return 0;

  const key = `intelligence:${channel}`;
  let existingIds = new Set<string>();
  try {
    existingIds = new Set(await redis.hkeys(key));
  } catch (err) {
    console.error(`[storage] Failed to list existing ${channel} item IDs:`, err);
  }
  const savedCount = articles.filter(article => !existingIds.has(article.id)).length;

  // Chunked HSET keeps the archive append-only while avoiding hundreds of
  // sequential network round trips as the historical dataset grows.
  for (let index = 0; index < articles.length; index += 100) {
    const batch = articles.slice(index, index + 100);
    try {
      await redis.hset(key, Object.fromEntries(
        batch.map(article => [article.id, JSON.stringify(article)]),
      ));
    } catch (err) {
      console.error(`[storage] Failed to save ${channel} intelligence batch:`, err);
      throw err;
    }
  }

  await redis.hset('meta:intelligence', {
    [channel]: JSON.stringify({
      count: await redis.hlen(key),
      syncedAt: new Date().toISOString(),
    }),
  }).catch((err) => console.error('[storage] Failed to update intelligence metadata:', err));

  return savedCount;
}

export async function getStoredIntelligence(channel: IntelligenceChannel): Promise<IntelArticle[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const hash = await redis.hgetall<Record<string, unknown>>(`intelligence:${channel}`);
    if (!hash) return [];

    return Object.values(hash).flatMap((value) => {
      try {
        return [(typeof value === 'string' ? JSON.parse(value) : value) as IntelArticle];
      } catch {
        return [];
      }
    });
  } catch (err) {
    console.error(`[storage] Failed to read ${channel} intelligence:`, err);
    return [];
  }
}

// ─── Newsletter subscriber storage ───────────────────────────

function subscriberKey(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

export async function upsertSubscriber(
  email: string,
  topics: NewsletterTopic[],
  status: SubscriberRecord['status'],
  source = 'website',
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const key = subscriberKey(normalizedEmail);
  const now = new Date().toISOString();
  let createdAt = now;

  try {
    const existing = await redis.hget<SubscriberRecord>('newsletter:subscribers', key);
    if (existing?.createdAt) createdAt = existing.createdAt;

    const record: SubscriberRecord = {
      email: normalizedEmail,
      topics,
      status,
      source,
      createdAt,
      updatedAt: now,
    };

    await redis.hset('newsletter:subscribers', { [key]: JSON.stringify(record) });
    for (const previousTopic of existing?.topics || []) {
      if (!topics.includes(previousTopic)) {
        await redis.srem(`newsletter:topic:${previousTopic}`, key);
      }
    }
    for (const topic of topics) {
      await redis.sadd(`newsletter:topic:${topic}`, key);
    }

    return true;
  } catch (err) {
    console.error('[storage] Failed to save newsletter subscriber:', err);
    return false;
  }
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
  intelligence: Record<IntelligenceChannel, number>;
  subscribers: number;
}> {
  const redis = getRedisClient();
  if (!redis) return {
    articles: [],
    papers: [],
    intelligence: { media: 0, 'private-equity': 0 },
    subscribers: 0,
  };

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

    const [media, privateEquity, subscribers] = await Promise.all([
      redis.hlen('intelligence:media'),
      redis.hlen('intelligence:private-equity'),
      redis.hlen('newsletter:subscribers'),
    ]);

    return {
      articles: articleStats,
      papers: paperStats,
      intelligence: { media, 'private-equity': privateEquity },
      subscribers,
    };
  } catch (err) {
    console.error('[storage] Failed to get stats:', err);
    return {
      articles: [],
      papers: [],
      intelligence: { media: 0, 'private-equity': 0 },
      subscribers: 0,
    };
  }
}
