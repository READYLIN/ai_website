import { IntelArticle } from './types';
import { getNonListedDoubao } from './storage';

/**
 * 从 MySQL 读取历史抓取的非上市公司情报（只读展示）。
 *
 * 注意：豆包（Ark）联网搜索已因成本过高整体下线。本函数仅读取之前已抓取
 * 入库的数据，不会发起任何付费搜索请求。
 */
export async function fetchNonListedDoubaoIntel(): Promise<IntelArticle[]> {
  try {
    return await getNonListedDoubao();
  } catch (err) {
    console.error('[non-listed-doubao] read failed:', err);
    return [];
  }
}
