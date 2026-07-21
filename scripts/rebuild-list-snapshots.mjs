import { writeFileSync } from 'node:fs';
import path from 'node:path';
import nextEnv from '@next/env';
import { Redis } from '@upstash/redis';

const root = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(root);

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) throw new Error('Upstash Redis is not configured');

const redis = new Redis({ url, token });

async function scanHash(key) {
  const rows = [];
  let cursor = '0';
  do {
    const [nextCursor, entries] = await redis.hscan(key, cursor, { count: 25 });
    cursor = String(nextCursor);
    for (let index = 1; index < entries.length; index += 2) {
      const value = entries[index];
      try {
        rows.push(typeof value === 'string' ? JSON.parse(value) : value);
      } catch {
        // Ignore malformed legacy rows while preserving the rest of the archive.
      }
    }
  } while (cursor !== '0');
  return rows;
}

async function collectMonthly(prefix, indexKey) {
  const months = (await redis.smembers(indexKey)).sort();
  const batches = [];
  for (const month of months) batches.push(await scanHash(`${prefix}:${month}`));
  return batches.flat();
}

function dedupeAndSort(items) {
  const byId = new Map(items.filter(item => item?.id).map(item => [item.id, item]));
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime(),
  );
}

function articleListItem(article) {
  const { content: _content, contentZh: _contentZh, ...item } = article;
  return {
    ...item,
    description: String(item.description || '').slice(0, 500),
    descriptionZh: item.descriptionZh ? String(item.descriptionZh).slice(0, 500) : undefined,
  };
}

function paperListItem(paper) {
  return { ...paper, abstract: String(paper.abstract || '').slice(0, 700) };
}

async function saveSnapshot(key, items, localFilename) {
  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  const payload = JSON.stringify(snapshot);
  await redis.set(key, payload);
  if (localFilename) {
    writeFileSync(path.join(root, 'data', localFilename), `${JSON.stringify(snapshot, null, 2)}\n`);
  }
  return { key, count: items.length, bytes: Buffer.byteLength(payload) };
}

const [articles, papers, media, privateEquity] = await Promise.all([
  collectMonthly('articles', 'meta:months:articles'),
  collectMonthly('papers', 'meta:months:papers'),
  scanHash('intelligence:media'),
  scanHash('intelligence:private-equity'),
]);

const results = [];
results.push(await saveSnapshot(
  'snapshot:list:articles:v1',
  dedupeAndSort(articles).map(articleListItem),
  'articles-list.json',
));
results.push(await saveSnapshot(
  'snapshot:list:papers:v1',
  dedupeAndSort(papers).map(paperListItem),
  'papers-list.json',
));
results.push(await saveSnapshot(
  'snapshot:list:intelligence:media:v1',
  dedupeAndSort(media),
));
results.push(await saveSnapshot(
  'snapshot:list:intelligence:private-equity:v1',
  dedupeAndSort(privateEquity),
));

console.log(JSON.stringify({ success: true, snapshots: results }, null, 2));
