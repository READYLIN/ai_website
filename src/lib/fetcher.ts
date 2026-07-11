import Parser from 'rss-parser';
import { Article } from './types';
import { rssSources, DEFAULT_REVALIDATE, normalizeCategories } from './rss-sources';
import { translateArticle } from './translator';
import { scrapeArticleContent, decodeHtmlEntities } from './scraper';
import { makeId, normalizeTitle, normalizeUrl, dedupeByTitleAndUrl, sortByDate, withTtlCache } from './feed-utils';
import { getStoredArticles, saveArticles } from './storage';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'AI News Hub/1.0',
  },
});

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

    const articles = await Promise.all(
      items.map(async (item) => {
        const title = item.title || 'Untitled';
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
      })
    );

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
}, 5000);

/**
 * Main entry point: merge stored (historical) articles with live-fetched ones.
 * Automatically saves new live articles to storage.
 */
export async function fetchAllArticles(): Promise<Article[]> {
  // 1. Read stored articles (June + July by default)
  const storedPromise = getStoredArticles().catch(() => [] as Article[]);

  // 2. Live fetch (with 5s TTL cache)
  const livePromise = fetchWithCache();

  const [stored, live] = await Promise.all([storedPromise, livePromise]);

  // 3. Merge: stored serve as base, live articles de-dupe and add new ones
  const merged = [...stored];
  const seenIds = new Set(stored.map((a) => a.id));
  const seenTitles = new Set(stored.map((a) => normalizeTitle(a.titleZh || a.title)));
  const seenUrls = new Set(stored.map((a) => normalizeUrl(a.url)).filter(Boolean));

  for (const article of live) {
    const normTitle = normalizeTitle(article.titleZh || article.title);
    const normUrl = normalizeUrl(article.url);

    if (seenIds.has(article.id) || seenTitles.has(normTitle) || (article.url && seenUrls.has(normUrl))) {
      continue;
    }
    seenIds.add(article.id);
    seenTitles.add(normTitle);
    if (article.url) seenUrls.add(normUrl);
    merged.push(article);
  }

  // 4. Sort merged by date descending
  merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // 5. Auto-save new articles in the background (don't block the response)
  if (live.length > 0) {
    saveArticles(live).catch((err) => console.error('[fetcher] Background save failed:', err));
  }

  return merged;
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
