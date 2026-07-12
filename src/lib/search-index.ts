import { fetchAllArticles } from './fetcher';
import { fetchAllMediaIntel } from './media-intel';
import { fetchPEIntel } from './pe-intel';

let cachedIndex: any = null;
let cacheTimestamp = 0;
const INDEX_TTL = 60000;

interface SearchDoc {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  source: string;
  categories: string;
  type: 'article' | 'media' | 'pe';
  url: string;
  publishedAt: string;
  company?: string;
}

async function buildIndex(): Promise<any> {
  const flexsearch = require('flexsearch');
  const index = new flexsearch.Document({
    preset: 'match',
    document: {
      id: 'id',
      index: ['title', 'titleZh', 'description', 'source', 'categories', 'company'],
      store: ['title', 'titleZh', 'description', 'descriptionZh', 'source', 'categories', 'type', 'url', 'publishedAt', 'company'],
    },
    tokenize: 'forward',
    charset: 'latin:extra',
  });

  try {
    const articles = await fetchAllArticles().catch(() => [] as any[]);
    let media: any[] = [];
    let pe: any[] = [];
    try { media = fetchAllMediaIntel(); } catch { media = []; }
    try { pe = fetchPEIntel(); } catch { pe = []; }
    for (const a of articles) {
      index.add({ id: a.id, title: a.title || '', titleZh: a.titleZh || '', description: a.description || '', descriptionZh: a.descriptionZh || '', source: a.source || '', categories: (a.categories || []).join(' '), type: 'article', url: a.url || '', publishedAt: a.publishedAt || '' });
    }
    for (const m of media) {
      index.add({ id: m.id, title: m.title || '', titleZh: m.title || '', description: m.description || '', descriptionZh: m.description || '', source: m.source || '', categories: (m.categories || []).join(' '), type: 'media', url: m.url || '', publishedAt: m.publishedAt || '', company: m.company || '' });
    }
    for (const p of pe) {
      index.add({ id: p.id, title: p.title || '', titleZh: p.title || '', description: p.description || '', descriptionZh: p.description || '', source: p.source || '', categories: (p.categories || []).join(' '), type: 'pe', url: p.url || '', publishedAt: p.publishedAt || '', company: p.company || '' });
    }
    cachedIndex = index;
    cacheTimestamp = Date.now();
  } catch (err) {
    console.error('[search] failed to build index:', err);
  }
  return index;
}

export async function searchAll(query: string, limit = 50): Promise<SearchDoc[]> {
  if (!query || query.length < 1) return [];
  let index = cachedIndex;
  if (!index || Date.now() - cacheTimestamp > INDEX_TTL) {
    index = await buildIndex();
  }
  if (!index) return [];
  const results = await index.search(query, { limit, enrich: true });
  const seen = new Set<string>();
  const docs: SearchDoc[] = [];
  for (const fieldResult of results) {
    const items = fieldResult.result || [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      docs.push(item as SearchDoc);
      if (docs.length >= limit) return docs;
    }
  }
  return docs;
}