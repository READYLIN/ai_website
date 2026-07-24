// 识澜·铸闻 — 全市场涨跌家数（东方财富免费源，UTF-8 JSON，无需 Key）
// 通过 clist 拉取全 A 股（沪深主板 + 创业板 + 科创板）当日涨跌幅，统计 上涨/下跌/平盘 家数。
// 免费源可能限流（返回空），此时优雅降级：available=false 并给出说明，稿件不含涨跌家数。

import { fetchJson } from './util';
import type { MarketBreadth } from './types';

const EASTMONEY = 'https://push2.eastmoney.com/api/qt/clist/get';
// 全 A 股：深主板(m:0+t:2) + 创业板(m:0+t:3) + 沪主板(m:1+t:2) + 科创板(m:1+t:3)
const FS = 'm:0+t:2,m:0+t:3,m:1+t:2,m:1+t:3';

interface EmRow {
  f3?: number | string; // 涨跌幅 %
}
interface EmResp {
  data?: { diff?: Record<string, EmRow> };
}

export async function getMarketBreadth(): Promise<MarketBreadth> {
  const url = `${EASTMONEY}?pn=1&pz=10000&fs=${encodeURIComponent(FS)}&fields=f12,f14,f3`;
  try {
    const data = await fetchJson<EmResp>(url, { timeoutMs: 20000, retries: 2 });
    const diff = data?.data?.diff;
    if (!diff || typeof diff !== 'object') {
      return { up: 0, down: 0, flat: 0, total: 0, available: false, note: '免费源未返回涨跌家数（可能限流，请稍后重试或接入付费数据源）' };
    }
    let up = 0;
    let down = 0;
    let flat = 0;
    for (const v of Object.values(diff)) {
      const pct = Number((v as EmRow).f3);
      if (!Number.isFinite(pct)) continue;
      if (pct > 0) up++;
      else if (pct < 0) down++;
      else flat++;
    }
    const total = up + down + flat;
    if (total === 0) {
      return { up: 0, down: 0, flat: 0, total: 0, available: false, note: '涨跌家数取数为 0（免费源可能限流）' };
    }
    return { up, down, flat, total, available: true };
  } catch (e) {
    return {
      up: 0,
      down: 0,
      flat: 0,
      total: 0,
      available: false,
      note: `涨跌家数获取失败：${e instanceof Error ? e.message : String(e)}（免费源可能限流，稿件将不含涨跌家数）`,
    };
  }
}
