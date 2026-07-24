// 识澜·铸闻 — 一次完整的大盘快照抓取（指数 + 涨跌家数，并行）。

import { getMarketIndices } from './indices';
import { getMarketBreadth } from './breadth';
import type { MarketSnapshot } from './types';

function nowParts(): { date: string; time: string } {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
  };
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [indices, breadth] = await Promise.all([getMarketIndices(), getMarketBreadth()]);
  const { date, time } = nowParts();
  return {
    date,
    time,
    indices,
    breadth,
    source: '新浪财经（指数）/ 东方财富（涨跌家数）',
  };
}
