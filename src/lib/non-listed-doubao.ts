import { IntelArticle } from './types';
import { getRedisClient } from './storage';

const NON_LISTED_DOUBAO_KEY = 'intelligence:non-listed-doubao';

/**
 * 从云端读取历史抓取的非上市公司情报（只读展示）。
 *
 * 注意：豆包（Ark）联网搜索已因成本过高整体下线。本函数仅读取 Upstash 中
 * 之前已抓取的数据，不会发起任何付费搜索请求。
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
