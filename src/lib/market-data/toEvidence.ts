// 识澜·铸闻 — 大盘快照 → 铸闻证据 转换
// 把一次大盘抓取结果转成 InlineEvidenceItem[]（手填证据形态），直接喂给
// generateCustomArticle，从而复用 Fact Sheet → 生成 → 逐句核查 → 编辑器 全管线。
// 不新增数据库表：行情作为"库外证据"冗余落库到 generated_article_evidence。

import type { InlineEvidenceItem } from '../article-generator/types';
import type { MarketSnapshot } from './types';

function fmt(n: number, d = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('zh-CN', { maximumFractionDigits: d, minimumFractionDigits: d });
}

/** 指数点位 / 涨跌点：不带千分位（如 3876.78），更符合行情展示习惯。 */
function fmtPt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

/** 成交量：手 → 万手 / 亿手 */
function fmtWanShou(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e8) return `${fmt(v / 1e8, 2)} 亿手`;
  if (v >= 1e4) return `${fmt(v / 1e4, 2)} 万手`;
  return `${fmt(v, 0)} 手`;
}

/** 成交额：万元 → 亿元 / 万亿元 */
function fmtYiYuan(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e8) return `${fmt(v / 1e8, 2)} 万亿元`;
  if (v >= 1e4) return `${fmt(v / 1e4, 2)} 亿元`;
  return `${fmt(v, 0)} 万元`;
}

/** 派生稿件主题：默认「A股大盘综述（日期）」。 */
export function buildMarketTopic(date: string): string {
  return `A股大盘综述（${date}）`;
}

/** 大盘快照 → 证据列表（指数快照 + 涨跌家数 / 降级提示）。 */
export function buildMarketEvidence(s: MarketSnapshot): InlineEvidenceItem[] {
  const items: InlineEvidenceItem[] = [];

  // 证据一：主要指数快照
  const idxLines =
    s.indices.length > 0
      ? s.indices.map((x) => {
          const dir = x.change > 0 ? '上涨' : x.change < 0 ? '下跌' : '平盘';
          return `${x.name}（${x.code}）：${fmtPt(x.current)} 点，${dir} ${x.change >= 0 ? '+' : ''}${fmtPt(x.change)} 点（${x.changePct >= 0 ? '+' : ''}${fmtPt(x.changePct)}%），成交量 ${fmtWanShou(x.volume)}，成交额 ${fmtYiYuan(x.amount)}。`;
        })
      : ['(指数数据获取失败，请检查网络或稍后重试。)'];
  items.push({
    title: `A股大盘指数快照（${s.date} ${s.time}）`,
    content: idxLines.join('\n'),
    source: '新浪财经实时行情（免费源）',
    url: 'https://finance.sina.com.cn',
    publishedAt: s.date,
  });

  // 证据二：全市场涨跌家数（取数失败则降级说明）
  if (s.breadth.available) {
    items.push({
      title: `全市场涨跌家数（${s.date}）`,
      content: `截至 ${s.date} ${s.time}，全市场（沪深主板 + 创业板 + 科创板）共 ${s.breadth.total} 只个股：上涨 ${s.breadth.up} 家，下跌 ${s.breadth.down} 家，平盘 ${s.breadth.flat} 家。`,
      source: '东方财富（免费源）',
      url: 'https://quote.eastmoney.com',
      publishedAt: s.date,
    });
  } else {
    items.push({
      title: '全市场涨跌家数（暂不可用）',
      content: s.breadth.note || '涨跌家数免费源暂不可用，稿件未包含涨跌家数，请以交易所官方数据为准。',
      source: '系统提示',
      url: '',
      publishedAt: s.date,
    });
  }

  return items;
}
