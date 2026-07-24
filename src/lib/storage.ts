import { createPool, type Pool } from 'mysql2/promise';
import { createHash } from 'crypto';
import {
  Article,
  IntelligenceChannel,
  IntelligenceSourceCandidate,
  IntelligenceSourceCandidateInput,
  IntelArticle,
  Paper,
  SubscriberRecord,
} from './types';
import { NewsletterTopic } from './newsletter';

// ─── MySQL Pool (lazy singleton) ──────────────────────────────
//
// Previously this module spoke to Upstash Redis over REST. It now uses a local
// MySQL database (teacher requirement: no Redis). All exported function
// signatures are unchanged so callers (pages, API routes, fetchers) need no
// edits. JSON payloads are stored in JSON columns and serialized explicitly on
// write (mysql2's `query` format mode stringifies plain objects to
// "[object Object]", so we pass JSON strings ourselves). On read, mysql2
// returns JSON columns as parsed objects already.

let _pool: Pool | null | undefined;

export function getPool(): Pool | null {
  if (_pool !== undefined) return _pool;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'ai_web';

  try {
    _pool = createPool({
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 10,
      waitForConnections: true,
      charset: 'utf8mb4',
      // Reconnect on dropped connections instead of throwing.
      enableKeepAlive: true,
    });
  } catch (err) {
    console.error('[storage] Failed to create MySQL pool:', err);
    _pool = null;
  }
  return _pool;
}

/** True when a MySQL connection can be established. */
export function isCloudStorageConfigured(): boolean {
  return getPool() !== null;
}

// ─── Helpers ──────────────────────────────────────────────────

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTargetMonths(): string[] {
  const env = process.env.STORAGE_MONTHS;
  if (env) return env.split(',').map((s) => s.trim());

  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
  }
  return months;
}

function parseData(value: unknown): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// ─── List reads (formerly snapshot-backed) ────────────────────
//
// Snapshots used to be denormalized caches in Redis. With MySQL, list reads
// query the tables directly (cheap, always fresh). The merge/replace snapshot
// functions below are kept as no-ops so the sync route's call sites stay valid.

export async function getStoredArticleList(): Promise<Article[]> {
  const months = await getAvailableMonths('articles');
  return getStoredArticles(months);
}

export async function getStoredPaperList(): Promise<Paper[]> {
  const months = await getAvailableMonths('papers');
  return getStoredPapers(months);
}

export async function getStoredIntelligenceList(channel: IntelligenceChannel): Promise<IntelArticle[]> {
  return getStoredIntelligence(channel);
}

export async function mergeArticleListSnapshot(_articles: Article[]): Promise<void> {
  // No-op: list reads query the table directly now.
}

export async function mergePaperListSnapshot(_papers: Paper[]): Promise<void> {
  // No-op: list reads query the table directly now.
}

export async function mergeIntelligenceListSnapshot(
  _channel: IntelligenceChannel,
  _articles: IntelArticle[],
): Promise<void> {
  // No-op: list reads query the table directly now.
}

export async function replaceIntelligenceListSnapshot(
  _channel: IntelligenceChannel,
  _articles: IntelArticle[],
): Promise<void> {
  // No-op: list reads query the table directly now.
}

export async function getStoredArticleById(id: string): Promise<Article | undefined> {
  const pool = getPool();
  if (!pool) return undefined;
  const [rows] = await pool.query('SELECT data FROM articles WHERE id = ? LIMIT 1', [id]);
  const row = (rows as any[])[0];
  return row ? (parseData(row.data) as Article) : undefined;
}

export async function getStoredPaperById(id: string): Promise<Paper | undefined> {
  const pool = getPool();
  if (!pool) return undefined;
  const [rows] = await pool.query('SELECT data FROM papers WHERE id = ? LIMIT 1', [id]);
  const row = (rows as any[])[0];
  return row ? (parseData(row.data) as Paper) : undefined;
}

// ─── Article Storage ──────────────────────────────────────────

export async function saveArticles(articles: Article[]): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;

  const targetMonths = getTargetMonths();
  const toSave = articles.filter((a) => targetMonths.includes(getMonthKey(a.publishedAt)));
  if (toSave.length === 0) return 0;

  // Determine which ids are already present so we only insert new ones
  // (mirrors the old HSETNX "don't overwrite" behaviour).
  const ids = toSave.map((a) => a.id);
  const [existingRows] = await pool.query('SELECT id FROM articles WHERE id IN (?)', [ids]);
  const existing = new Set((existingRows as any[]).map((r) => r.id));

  let saved = 0;
  for (const article of toSave) {
    if (existing.has(article.id)) continue;
    const month = getMonthKey(article.publishedAt);
    await pool.query(
      'INSERT INTO articles (id, month, published_at, data) VALUES (?, ?, ?, ?)',
      [article.id, month, article.publishedAt, JSON.stringify(article)],
    );
    saved++;
  }
  return saved;
}

export async function getStoredArticles(months?: string[]): Promise<Article[]> {
  const pool = getPool();
  if (!pool) return [];

  const targetMonths = months && months.length > 0 ? months : getTargetMonths();
  if (targetMonths.length === 0) return [];

  const [rows] = await pool.query(
    'SELECT data FROM articles WHERE month IN (?)',
    [targetMonths],
  );
  // Sort in JS: the JSON `data` column is large, and a SQL filesort over it
  // can exhaust the server's sort_buffer_size ("Out of sort memory").
  return (rows as any[])
    .map((r) => parseData(r.data) as Article)
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

// ─── Paper Storage ────────────────────────────────────────────

export async function savePapers(papers: Paper[]): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;

  const targetMonths = getTargetMonths();
  const toSave = papers.filter((p) => targetMonths.includes(getMonthKey(p.publishedAt)));
  if (toSave.length === 0) return 0;

  const ids = toSave.map((p) => p.id);
  const [existingRows] = await pool.query('SELECT id FROM papers WHERE id IN (?)', [ids]);
  const existing = new Set((existingRows as any[]).map((r) => r.id));

  let saved = 0;
  for (const paper of toSave) {
    if (existing.has(paper.id)) continue;
    const month = getMonthKey(paper.publishedAt);
    await pool.query(
      'INSERT INTO papers (id, month, published_at, data) VALUES (?, ?, ?, ?)',
      [paper.id, month, paper.publishedAt, JSON.stringify(paper)],
    );
    saved++;
  }
  return saved;
}

export async function getStoredPapers(months?: string[]): Promise<Paper[]> {
  const pool = getPool();
  if (!pool) return [];

  const targetMonths = months && months.length > 0 ? months : getTargetMonths();
  if (targetMonths.length === 0) return [];

  const [rows] = await pool.query(
    'SELECT data FROM papers WHERE month IN (?)',
    [targetMonths],
  );
  return (rows as any[])
    .map((r) => parseData(r.data) as Paper)
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

// ─── Structured intelligence storage ─────────────────────────

export async function saveIntelligence(
  channel: IntelligenceChannel,
  articles: IntelArticle[],
): Promise<number> {
  const pool = getPool();
  if (!pool || articles.length === 0) return 0;

  const [existingRows] = await pool.query(
    'SELECT id FROM intelligence WHERE channel = ?',
    [channel],
  );
  const existing = new Set((existingRows as any[]).map((r) => r.id));

  let saved = 0;
  for (const article of articles) {
    if (existing.has(article.id)) continue;
    await pool.query(
      'INSERT INTO intelligence (id, channel, published_at, data) VALUES (?, ?, ?, ?)',
      [article.id, channel, article.publishedAt, JSON.stringify(article)],
    );
    saved++;
  }
  return saved;
}

export async function pruneIntelligence(
  channel: IntelligenceChannel,
  retainedIds: Set<string>,
): Promise<number> {
  const pool = getPool();
  if (!pool || retainedIds.size === 0) return 0;

  const [result] = await pool.query(
    'DELETE FROM intelligence WHERE channel = ? AND id NOT IN (?)',
    [channel, Array.from(retainedIds)],
  );
  return (result as any).affectedRows ?? 0;
}

export async function getStoredIntelligence(channel: IntelligenceChannel): Promise<IntelArticle[]> {
  const pool = getPool();
  if (!pool) return [];

  const [rows] = await pool.query(
    'SELECT data FROM intelligence WHERE channel = ?',
    [channel],
  );
  return (rows as any[])
    .map((r) => parseData(r.data) as IntelArticle)
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
}

// ─── Intelligence source discovery queue ─────────────────────

function safeSourceHost(value: string): string | null {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (parsed.protocol !== 'https:' || !host || host === 'localhost' || host.endsWith('.local')) return null;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':')) return null;
    return host;
  } catch {
    return null;
  }
}

export async function saveIntelligenceSourceCandidates(
  inputs: IntelligenceSourceCandidateInput[],
): Promise<IntelligenceSourceCandidate[]> {
  const pool = getPool();
  if (!pool) return [];

  const output: IntelligenceSourceCandidate[] = [];
  for (const input of inputs.slice(0, 50)) {
    const host = safeSourceHost(input.articleUrl);
    if (!host || !['media', 'private-equity'].includes(input.channel)) continue;

    const id = createHash('sha256').update(`${input.channel}\0${host}`).digest('hex').slice(0, 24);
    const now = new Date().toISOString();

    let existing: IntelligenceSourceCandidate | null = null;
    const [existingRows] = await pool.query(
      'SELECT data FROM source_candidates WHERE id = ? LIMIT 1',
      [id],
    );
    const er = (existingRows as any[])[0];
    if (er) existing = parseData(er.data) as IntelligenceSourceCandidate;

    const evidenceTitles = Array.from(new Set([
      ...(existing?.evidenceTitles || []),
      String(input.evidenceTitle || '').trim().slice(0, 180),
    ].filter(Boolean))).slice(-8);

    const candidate: IntelligenceSourceCandidate = {
      id,
      channel: input.channel,
      sourceName: String(input.sourceName || host).trim().slice(0, 100),
      articleUrl: input.articleUrl,
      directFeedUrl: input.directFeedUrl && safeSourceHost(input.directFeedUrl)
        ? input.directFeedUrl
        : existing?.directFeedUrl,
      rsshubRouteHint: String(input.rsshubRouteHint || existing?.rsshubRouteHint || '').trim().slice(0, 240) || undefined,
      evidenceTitle: String(input.evidenceTitle || '').trim().slice(0, 180) || undefined,
      discoveredAt: input.discoveredAt || now,
      host,
      status: existing?.status || 'candidate',
      sightings: (existing?.sightings || 0) + 1,
      firstSeenAt: existing?.firstSeenAt || now,
      lastSeenAt: now,
      evidenceTitles,
    };

    await pool.query(
      'INSERT INTO source_candidates (id, channel, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel = VALUES(channel), data = VALUES(data)',
      [id, input.channel, JSON.stringify(candidate)],
    );
    output.push(candidate);
  }
  return output;
}

export async function getIntelligenceSourceCandidates(): Promise<IntelligenceSourceCandidate[]> {
  const pool = getPool();
  if (!pool) return [];

  const [rows] = await pool.query('SELECT data FROM source_candidates');
  return (rows as any[])
    .map((r) => parseData(r.data) as IntelligenceSourceCandidate)
    .sort((a, b) => b.sightings - a.sightings || b.lastSeenAt.localeCompare(a.lastSeenAt));
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
  const pool = getPool();
  if (!pool) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const key = subscriberKey(normalizedEmail);
  const now = new Date().toISOString();
  let createdAt = now;

  try {
    const [existingRows] = await pool.query(
      'SELECT data FROM subscribers WHERE email_hash = ? LIMIT 1',
      [key],
    );
    const er = (existingRows as any[])[0];
    if (er) {
      const existing = parseData(er.data) as SubscriberRecord;
      if (existing?.createdAt) createdAt = existing.createdAt;
    }

    const record: SubscriberRecord = {
      email: normalizedEmail,
      topics,
      status,
      source,
      createdAt,
      updatedAt: now,
    };

    await pool.query(
      'INSERT INTO subscribers (email_hash, email, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), data = VALUES(data)',
      [key, normalizedEmail, JSON.stringify(record)],
    );

    // Replace the topic set atomically.
    await pool.query('DELETE FROM subscriber_topics WHERE email_hash = ?', [key]);
    if (topics.length > 0) {
      const values = topics.map((t) => [key, t]);
      await pool.query(
        'INSERT IGNORE INTO subscriber_topics (email_hash, topic) VALUES ?',
        [values],
      );
    }

    return true;
  } catch (err) {
    console.error('[storage] Failed to save newsletter subscriber:', err);
    return false;
  }
}

// ─── Non-listed Doubao feed ──────────────────────────────────

export async function getNonListedDoubao(): Promise<IntelArticle[]> {
  const pool = getPool();
  if (!pool) return [];
  const [rows] = await pool.query('SELECT data FROM non_listed_doubao ORDER BY id');
  return (rows as any[]).map((r) => parseData(r.data) as IntelArticle);
}

// ─── Month Index ──────────────────────────────────────────────

export async function getAvailableMonths(type: 'articles' | 'papers'): Promise<string[]> {
  const pool = getPool();
  if (!pool) return [];
  const table = type === 'articles' ? 'articles' : 'papers';
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT month FROM ${table} WHERE month IS NOT NULL ORDER BY month`,
    );
    return (rows as any[]).map((r) => r.month);
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
  const pool = getPool();
  if (!pool) {
    return {
      articles: [],
      papers: [],
      intelligence: { media: 0, 'private-equity': 0 },
      subscribers: 0,
    };
  }

  try {
    const [articleRows] = await pool.query(
      'SELECT month, COUNT(*) AS count FROM articles GROUP BY month ORDER BY month',
    );
    const [paperRows] = await pool.query(
      'SELECT month, COUNT(*) AS count FROM papers GROUP BY month ORDER BY month',
    );
    const [intelRows] = await pool.query(
      'SELECT channel, COUNT(*) AS count FROM intelligence GROUP BY channel',
    );
    const [subRows] = await pool.query('SELECT COUNT(*) AS count FROM subscribers');

    const articles = (articleRows as any[]).map((r) => ({ month: r.month, count: Number(r.count) }));
    const papers = (paperRows as any[]).map((r) => ({ month: r.month, count: Number(r.count) }));

    const intelCounts: Record<string, number> = {};
    for (const r of intelRows as any[]) intelCounts[r.channel] = Number(r.count);

    const subscribers = Number((subRows as any[])[0]?.count ?? 0);

    return {
      articles,
      papers,
      intelligence: {
        media: intelCounts['media'] ?? 0,
        'private-equity': intelCounts['private-equity'] ?? 0,
      },
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
