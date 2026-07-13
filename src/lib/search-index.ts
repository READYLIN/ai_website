import { fetchAllArticles } from './fetcher';
import { fetchAllMediaIntel } from './media-intel';
import { fetchPEIntel } from './pe-intel';

let cachedDocs: SearchDoc[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

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

async function loadDocs(): Promise<SearchDoc[]> {
  const now = Date.now();
  if (cachedDocs && now - cacheTimestamp < CACHE_TTL) return cachedDocs;

  const docs: SearchDoc[] = [];
  try {
    const articles = await fetchAllArticles().catch(() => [] as any[]);
    for (const a of articles) {
      docs.push({ id: a.id, title: a.title || '', titleZh: a.titleZh || '', description: a.description || '', descriptionZh: a.descriptionZh || '', source: a.source || '', categories: (a.categories || []).join(' '), type: 'article', url: a.url || '', publishedAt: a.publishedAt || '' });
    }
  } catch (e) { console.error('[search] articles fetch failed:', e); }

  try {
    const media = fetchAllMediaIntel();
    for (const m of media) {
      docs.push({ id: m.id, title: m.title || '', titleZh: m.title || '', description: m.description || '', descriptionZh: m.description || '', source: m.source || '', categories: (m.categories || []).join(' '), type: 'media', url: m.url || '', publishedAt: m.publishedAt || '', company: m.company || '' });
    }
  } catch (e) { console.error('[search] media fetch failed:', e); }

  try {
    const pe = fetchPEIntel();
    for (const p of pe) {
      docs.push({ id: p.id, title: p.title || '', titleZh: p.title || '', description: p.description || '', descriptionZh: p.description || '', source: p.source || '', categories: (p.categories || []).join(' '), type: 'pe', url: p.url || '', publishedAt: p.publishedAt || '', company: p.company || '' });
    }
  } catch (e) { console.error('[search] pe fetch failed:', e); }

  cachedDocs = docs;
  cacheTimestamp = now;
  return docs;
}

function score(doc: SearchDoc, terms: string[]): number {
  const text = [doc.title, doc.titleZh, doc.description, doc.descriptionZh, doc.source, doc.categories, doc.company || ''].join(' ').toLowerCase();
  let s = 0;
  for (const t of terms) {
    const idx = text.indexOf(t);
    if (idx >= 0) {
      s += 10;
      if (idx === 0 || text[idx - 1] === ' ') s += 5;
    }
  }
  // Boost title matches
  const titleText = (doc.title + ' ' + doc.titleZh).toLowerCase();
  if (terms.every(t => titleText.includes(t))) s += 20;
  return s;
}

export async function searchAll(query: string, limit = 50): Promise<SearchDoc[]> {
  if (!query || query.trim().length < 1) return [];

  const docs = await loadDocs();
  if (docs.length === 0) return [];

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = docs
    .map(d => ({ doc: d, score: score(d, terms) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.doc);

  return scored;
}