import Parser from 'rss-parser';
import { IntelArticle } from './types';
import { mediaSources } from './media-rss-sources';
import { makeId, withTtlCache } from './feed-utils';
import {
  cleanIntelligenceText,
  entityByName,
  sanitizeAndDedupeIntelligence,
} from './intelligence-rules';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Newsroom Intelligence Hub/2.0',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

// RSSHub 镜像回退链：任一 rsshub.* 路由会依次尝试这些镜像，直到成功。
// rssforever / rsshub.app 时有 403/超时；hub.slarker.me、rsshub.ktachibana.party
// 2026-07-20 实测稳定可用，作为额外回退，显著提升所有 RSSHub 路由的成功率。
const RSSHUB_MIRRORS = [
  process.env.RSSHUB_BASE_URL,
  'https://rsshub.rssforever.com',
  'https://rsshub.app',
  'https://hub.slarker.me',
  'https://rsshub.ktachibana.party',
].filter((value): value is string => Boolean(value));

function candidateUrls(url: string): string[] {
  if (!/https:\/\/rsshub\.[^/]+/i.test(url)) return [url];
  const suffix = new URL(url).pathname + new URL(url).search;
  return Array.from(new Set(RSSHUB_MIRRORS.map(base => `${base.replace(/\/$/, '')}${suffix}`)));
}

async function parseWithFallback(url: string) {
  let lastError: unknown;
  for (const candidate of candidateUrls(url)) {
    try {
      return await parser.parseURL(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Unable to fetch ${url}`);
}

async function fetchSingleSource(source: typeof mediaSources[number]): Promise<IntelArticle[]> {
  try {
    const feed = await parseWithFallback(source.url);
    const isCompanyDisclosure = source.url.includes('/disclosure/');
    const declaredCompany = isCompanyDisclosure ? entityByName(source.name, 'media') : undefined;

    const raw = (feed.items || []).slice(0, 30).map((item): IntelArticle => {
      const rawTitle = cleanIntelligenceText(item.title || '', 180) || '未命名资讯';
      const title = declaredCompany ? `${declaredCompany.name}：${rawTitle}` : rawTitle;
      const description = cleanIntelligenceText(
        item.contentSnippet || item.summary || item.content || item['content:encoded'] || '',
        260,
      );
      const guid = item.guid || item.link || `${title}-${source.name}`;

      return {
        id: `media-live-${makeId(guid)}`,
        title,
        description,
        url: item.link || '',
        source: source.name,
        categories: ['传媒监控', source.name],
        publishedAt: item.isoDate || item.pubDate || '',
        author: source.name,
        company: declaredCompany?.name,
        companyGroup: 'RSS 自动抓取',
        priority: 'P2',
        dimension: '待分类',
        matrixLabel: 'RSS 自动抓取',
        credibility: isCompanyDisclosure ? '高' : '中高',
      };
    });

    return sanitizeAndDedupeIntelligence(raw, 'media');
  } catch (error) {
    console.error(`[media-fetcher] Failed to fetch ${source.name}:`, error);
    return [];
  }
}

const fetchWithCache = withTtlCache<IntelArticle[]>(async () => {
  const results = await Promise.allSettled(mediaSources.map(source => fetchSingleSource(source)));
  const articles = results
    .filter((result): result is PromiseFulfilledResult<IntelArticle[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);
  return sanitizeAndDedupeIntelligence(articles, 'media');
}, 30 * 60 * 1000);

export async function fetchMediaArticles(): Promise<IntelArticle[]> {
  return fetchWithCache();
}

export function getSourceGroups(): { label: string; sources: string[] }[] {
  const stockSources = mediaSources.filter(source => source.url.includes('disclosure'));
  const newsSources = mediaSources.filter(source => !source.url.includes('disclosure'));
  return [
    { label: '新闻媒体 RSS', sources: newsSources.map(source => source.name) },
    { label: '上市公司公告 RSS', sources: stockSources.map(source => source.name) },
  ];
}
