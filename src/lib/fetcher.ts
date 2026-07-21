import Parser from 'rss-parser';
import { Article } from './types';
import { rssSources, DEFAULT_REVALIDATE, normalizeCategories } from './rss-sources';
import { translateArticle } from './translator';
import { scrapeArticleContent, decodeHtmlEntities } from './scraper';
import { makeId, dedupeByTitleAndUrl, sortByDate, withTtlCache } from './feed-utils';
import { saveArticles } from './storage';
import { getCachedArticleById, getCachedArticles } from './cached-storage';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI News Hub/1.0',
  },
});

// ─── Concurrency limiter ────────────────────────────────────────

async function pLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  const indices = items.map((_, i) => i);
  let active = 0;

  async function run() {
    while (indices.length > 0 && active < limit) {
      const i = indices.shift()!;
      active++;
      try {
        results[i] = await fn(items[i], i);
      } catch {
        // skip failed items
      } finally {
        active--;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results.filter((r): r is R => r !== undefined);
}

function extractImage(item: Record<string, unknown>): string | undefined {
  const enclosure = item.enclosure as { url?: string } | undefined;
  if (enclosure?.url) return enclosure.url;

  const mediaContent = item['media:content'] as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url) return mediaContent.$.url;

  const mediaThumbnail = item['media:thumbnail'] as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  const content = (item['content:encoded'] || item.content || '') as string;
  return extractImageFromContent(content);
}

function extractImageFromContent(content: string): string | undefined {
  try {
    const cheerio = require('cheerio') as { load: (html: string) => cheerio.CheerioAPI };
    const $ = cheerio.load(content);
    const firstImg = $('img').first();
    return firstImg.attr('src') || firstImg.attr('data-src') || undefined;
  } catch {
    return undefined;
  }
}

async function fetchSingleSource(source: (typeof rssSources)[0]): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 15);

    const articles: Article[] = await pLimit(items, 3, async (item) => {
      const rawTitle = item.title || 'Untitled';
      // Strip HTML tags from title — some RSS feeds embed full HTML docs
      const title = decodeHtmlEntities(rawTitle.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
      const rssDescription = item.contentSnippet
        ? item.contentSnippet.slice(0, 300)
        : item.content
          ? decodeHtmlEntities(item.content.replace(/<[^>]+>/g, '')).slice(0, 300)
          : '';
      const rssContent = item['content:encoded'] || item.content || '';

      const guid = item.guid || item.link || title + source.name;
      const id = makeId(guid);

      let finalDescription = rssDescription;
      let finalContent = rssContent;
      let finalImageUrl = extractImage(item as Record<string, unknown>);

      if (rssDescription.length < 80 && item.link) {
        try {
          const scraped = await scrapeArticleContent(item.link);
          if (scraped.content && scraped.content.replace(/<[^>]+>/g, '').trim().length > 100) {
            finalContent = scraped.content;
            finalDescription = scraped.content.replace(/<[^>]+>/g, '').slice(0, 300);
          }
        } catch {
          // keep RSS content as fallback
        }
      }

      let translation;
      try {
        translation = source.category === 'english'
          ? await translateArticle({ title, description: finalDescription, content: finalContent })
          : { titleZh: title, descriptionZh: finalDescription, contentZh: finalContent };
      } catch (err) {
        console.error(`Translation failed for "${title}" from ${source.name}:`, err);
        translation = { titleZh: title, descriptionZh: finalDescription, contentZh: finalContent };
      }

      return {
        id,
        title,
        titleZh: translation.titleZh,
        description: finalDescription,
        descriptionZh: translation.descriptionZh,
        content: finalContent,
        contentZh: translation.contentZh,
        url: item.link || '',
        imageUrl: finalImageUrl,
        source: source.name,
        sourceIcon: source.icon,
        categories: normalizeCategories(item.categories || []),
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        author: item.creator || item.author || source.name,
      };
    });

    return articles;
  } catch (error) {
    console.error(`Failed to fetch ${source.name}:`, error);
    return [];
  }
}

const fetchWithCache = withTtlCache<Article[]>(async () => {
  const results = await Promise.allSettled(
    rssSources.map((source) => fetchSingleSource(source))
  );

  const articles = results
    .filter((r): r is PromiseFulfilledResult<Article[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value);

  return sortByDate(dedupeByTitleAndUrl(articles, (a) => a.titleZh || a.title));
}, 60000);  // 60s cache — reduces live RSS load

/**
 * Main entry point: merge stored (historical) articles with live-fetched ones.
 * Automatically saves new live articles to storage.
 */
const fetchAllArticlesCached = withTtlCache(async (): Promise<Article[]> => {
  const stored = await getCachedArticles().catch(() => [] as Article[]);
  if (stored.length > 0) {
    return stored.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }

  // Cloud storage is the normal read path. Live RSS is a graceful fallback for
  // a fresh deployment before the first scheduled sync has populated Redis.
  const live = await fetchWithCache();
  if (live.length > 0) {
    saveArticles(live).catch((err) => console.error('[fetcher] Background save failed:', err));
  }
  return live;
}, 60 * 1000);

export async function fetchAllArticles(): Promise<Article[]> {
  return fetchAllArticlesCached();
}

export async function fetchArticleById(id: string): Promise<Article | undefined> {
  const stored = await getCachedArticleById(id).catch(() => undefined);
  if (stored) return stored;
  return (await fetchAllArticles()).find(article => article.id === id);
}

/**
 * Live-only fetch — bypasses storage entirely.
 * Used by cron/digest endpoints that only need today's articles.
 */
export async function fetchLiveArticles(): Promise<Article[]> {
  return fetchWithCache();
}

export async function fetchArticlesByCategory(category: string): Promise<Article[]> {
  const all = await fetchAllArticles();
  return all.filter((a) =>
    a.categories.some(
      (c) => c.toLowerCase() === category.toLowerCase()
    )
  );
}

export { DEFAULT_REVALIDATE };
