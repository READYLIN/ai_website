import Parser from 'rss-parser';
import { IntelArticle } from './types';
import { makeId, withTtlCache } from './feed-utils';
import { cleanIntelligenceText, sanitizeAndDedupeIntelligence } from './intelligence-rules';
import { peRssSources, PERSSSource } from './pe-rss-sources';
import monitorConfig from '../../data/intelligence-entities.json';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Newsroom Intelligence Hub/2.0',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  },
});

const RSSHUB_MIRRORS = [
  process.env.RSSHUB_BASE_URL,
  'https://rsshub.rssforever.com',
  'https://rsshub.app',
].filter((value): value is string => Boolean(value));

const googleQueries = [
  '私募股权 创投 募资 领投 跟投',
  'PE VC 基金 首关 终关 退出',
  '私募基金 管理人 备案 处罚 中基协',
  '创投机构 合伙人 任命 离职 战略合作',
];

function googleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans`;
}

function targetedEastmoneySources(): PERSSSource[] {
  const allCompanies = monitorConfig.privateEquity.map(entity => entity.name);
  if (allCompanies.length === 0) return [];

  const configuredLimit = Number.parseInt(process.env.TARGETED_RSS_COMPANY_LIMIT || '48', 10);
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.min(configuredLimit, allCompanies.length)
    : allCompanies.length;
  const dayNumber = Math.floor(Date.now() / 86400_000);
  const start = (dayNumber * limit) % allCompanies.length;
  const rotating = Array.from({ length: limit }, (_, index) => allCompanies[(start + index) % allCompanies.length]);
  const forced = monitorConfig.forcedPrivateEquityCompanies || [];
  const companies = Array.from(new Set([...forced, ...rotating]));
  const base = (process.env.RSSHUB_BASE_URL || 'https://rsshub.rssforever.com').replace(/\/$/, '');

  return companies.map(company => ({
    name: `东方财富搜索：${company}`,
    url: `${base}/eastmoney/search/${encodeURIComponent(company)}`,
    credibility: '中高',
    company,
  }));
}

function candidateUrls(url: string): string[] {
  if (!/https:\/\/rsshub\.[^/]+/i.test(url)) return [url];
  const parsed = new URL(url);
  const suffix = parsed.pathname + parsed.search;
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

async function fetchSource(source: PERSSSource): Promise<IntelArticle[]> {
  try {
    const feed = await parseWithFallback(source.url);
    const raw = (feed.items || []).slice(0, 35).map((item): IntelArticle => {
      const fullTitle = cleanIntelligenceText(item.title || '', 180) || '未命名资讯';
      const suffix = ` - ${source.name}`;
      const title = fullTitle.endsWith(suffix) ? fullTitle.slice(0, -suffix.length) : fullTitle;
      const description = cleanIntelligenceText(
        item.contentSnippet || item.summary || item.content || item['content:encoded'] || '',
        260,
      );
      return {
        id: `pe-live-${makeId(item.guid || item.link || `${title}-${source.name}`)}`,
        title,
        description,
        url: item.link || '',
        source: source.name,
        categories: ['私募股权', '待分类'],
        publishedAt: item.isoDate || item.pubDate || '',
        author: item.creator || source.name,
        company: source.company || '',
        companyGroup: 'RSS 自动抓取',
        priority: 'P2',
        dimension: '待分类',
        matrixLabel: 'RSS 自动抓取',
        credibility: source.credibility,
      };
    });
    return sanitizeAndDedupeIntelligence(raw, 'private-equity');
  } catch (error) {
    console.error(`[pe-fetcher] Failed RSS source "${source.name}":`, error);
    return [];
  }
}

const fetchWithCache = withTtlCache(async () => {
  const googleSources: PERSSSource[] = googleQueries.map((query, index) => ({
    name: `Google News PE/VC ${index + 1}`,
    url: googleNewsUrl(query),
    credibility: '中',
  }));
  const eastmoneySources = targetedEastmoneySources();
  const results = await Promise.allSettled(
    [...peRssSources, ...googleSources, ...eastmoneySources].map(fetchSource),
  );
  const items = results
    .filter((result): result is PromiseFulfilledResult<IntelArticle[]> => result.status === 'fulfilled')
    .flatMap(result => result.value);
  return sanitizeAndDedupeIntelligence(items, 'private-equity');
}, 30 * 60 * 1000);

export async function fetchLivePEIntel(): Promise<IntelArticle[]> {
  return fetchWithCache();
}
