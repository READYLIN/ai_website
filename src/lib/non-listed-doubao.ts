import { IntelArticle } from './types';
import { getRedisClient } from './storage';
import { nonListedCompanies } from './non-listed-companies';
import { runDoubaoCompanySearch, isDoubaoConfigured } from './doubao-search';

const NON_LISTED_DOUBAO_KEY = 'intelligence:non-listed-doubao';
const CURSOR_KEY = 'meta:non-listed-doubao-cursor';
// 每次同步只补一小批公司，避免单次 cron 超时；靠游标在多天内逐步覆盖全部 37 家。
const SLICE_PER_SYNC = 3;

/**
 * 从云端读取已抓取的豆包非上市公司情报（Vercel  ephemeral 文件系统下必须存云端）。
 */
export async function fetchNonListedDoubaoIntel(): Promise<IntelArticle[]> {
  const redis = getRedisClient();
  if (!redis) return [];
  try {
    const hash = await redis.hgetall<Record<string, unknown>>(NON_LISTED_DOUBAO_KEY);
    if (!hash) return [];
    return Object.values(hash).flatMap((value) => {
      try {
        return [(typeof value === 'string' ? JSON.parse(value) : value) as IntelArticle];
      } catch {
        return [];
      }
    });
  } catch (err) {
    console.error('[non-listed-doubao] read failed:', err);
    return [];
  }
}

/**
 * 增量抓取一小批非上市公司的豆包联网搜索结果并写入云端。
 * 由 storage/sync 在每次 cron 末尾调用；缺密钥或失败均不影响主同步。
 */
export async function syncNonListedDoubaoToCloud(slice = SLICE_PER_SYNC): Promise<{
  configured: boolean;
  processed: number;
  added: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (!isDoubaoConfigured()) {
    return { configured: false, processed: 0, added: 0, errors: ['ARK_SEARCH_API_KEY 未配置，跳过豆包补充'] };
  }

  const redis = getRedisClient();
  if (!redis) {
    return { configured: true, processed: 0, added: 0, errors: ['Upstash Redis 未配置'] };
  }

  const total = nonListedCompanies.length;
  let cursor = 0;
  try {
    const raw = await redis.get(CURSOR_KEY);
    if (raw != null) cursor = parseInt(String(raw), 10) % total;
  } catch { /* ignore */ }

  const batch = Array.from({ length: slice }, (_, i) => nonListedCompanies[(cursor + i) % total].name);

  const results = await Promise.all(
    batch.map((name) => runDoubaoCompanySearch(name).catch((e) => ({
      company: name, total: 0, verified: 0, rejected: 0,
      errors: [String(e)], articles: [],
    }))),
  );

  let added = 0;
  for (const r of results) {
    if (r.errors.length) errors.push(`${r.company}: ${r.errors.join('; ')}`);
    if (r.articles.length === 0) continue;
    try {
      await redis.hset(
        NON_LISTED_DOUBAO_KEY,
        Object.fromEntries(r.articles.map((a) => [a.id, JSON.stringify(a)])),
      );
      added += r.articles.length;
    } catch (e) {
      errors.push(`写入 ${r.company} 失败: ${String(e)}`);
    }
  }

  try {
    await redis.set(CURSOR_KEY, String((cursor + slice) % total));
  } catch { /* ignore */ }

  return { configured: true, processed: batch.length, added, errors };
}
