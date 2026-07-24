// 识澜·铸闻 — 大盘指数行情（新浪财经免费源，GBK，无需 Key）
// 使用新浪「简版」实时接口 s_<code>，直接返回 名称/当前点位/涨跌点/涨跌幅%/成交量/成交额，
// 非常适合大盘综述场景（讲指数）。

import { fetchGbkText } from './util';
import type { MarketIndex } from './types';

/** 默认抓取的主要 A 股指数（Sina 简版代码）。 */
export const DEFAULT_INDEX_CODES = [
  's_sh000001', // 上证指数
  's_sz399001', // 深证成指
  's_sz399006', // 创业板指
  's_sh000300', // 沪深300
  's_sh000688', // 科创50
];

const SINA = 'https://hq.sinajs.cn/list=';

/** 解析一行简版指数行情：`名称,当前,涨跌点,涨跌幅%,成交量(手),成交额(万元)`。 */
export function parseBriefIndex(key: string, raw: string): MarketIndex | null {
  const parts = raw.split(',');
  if (parts.length < 6) return null;
  const code = key.replace(/^s_/, '');
  const current = Number(parts[1]);
  const change = Number(parts[2]);
  const changePct = Number(parts[3]);
  const volume = Number(parts[4]); // 手
  const amount = Number(parts[5]); // 万元
  if (![current, change, changePct, volume, amount].every(Number.isFinite)) return null;
  return {
    code,
    name: parts[0] || code,
    current,
    change,
    changePct,
    volume,
    amount,
  };
}

/** 抓取一组指数（默认主要 A 股指数）。 */
export async function getMarketIndices(codes: string[] = DEFAULT_INDEX_CODES): Promise<MarketIndex[]> {
  if (codes.length === 0) return [];
  const raw = await fetchGbkText(`${SINA}${codes.join(',')}`, {
    timeoutMs: 15000,
    retries: 2,
    headers: { Referer: 'https://finance.sina.com.cn' },
  });
  const out: MarketIndex[] = [];
  const re = /hq_str_([a-zA-Z0-9_]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const idx = parseBriefIndex(m[1], m[2]);
    if (idx) out.push(idx);
  }
  return out;
}
