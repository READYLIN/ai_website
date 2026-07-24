// 识澜·智稿 — 配置层
// 所有权重/阈值/可选值均从环境变量读取，带默认值，不在代码中硬编码。
// 每次调用时读取 process.env，便于单元测试通过 env 覆盖验证。

import type { ArticleType, ArticleStyle } from './types';

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  flash_news: '财经快讯',
  standard_news: '标准财经新闻',
  financing_news: '投融资新闻',
  ma_news: '并购新闻',
  company_news: '公司动态',
  bid_news: '中标与签约新闻',
  market_overview: '大盘综述',
};

export const STYLE_LABELS: Record<ArticleStyle, string> = {
  objective: '客观新闻体',
  financial_media: '财经媒体体',
  guangzhou_local: '广州本地媒体体',
  investment_brief: '投资研究简报体',
};

export interface ArticleGeneratorConfig {
  /** 默认稿件字数 */
  defaultTargetLength: number;
  /** 字数上限（输入文本限制长度，成本控制 §14.4） */
  maxTargetLength: number;
  /** 模型输入证据摘要总字符上限 */
  maxInputChars: number;
  /** 证据条数上限 */
  maxEvidenceCount: number;
  /** 单条证据摘要字数上限 */
  maxEvidenceSummaryChars: number;
  /** 事实核查每句最小长度（过短不计入核查） */
  minSentenceLength: number;
  /** supported 判定所需的最小证据 token 重叠数 */
  supportTokenOverlap: number;
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function getArticleGeneratorConfig(): ArticleGeneratorConfig {
  return {
    defaultTargetLength: num(process.env.ARTICLE_GEN_TARGET_LENGTH, 600),
    maxTargetLength: num(process.env.ARTICLE_GEN_MAX_LENGTH, 2000),
    maxInputChars: num(process.env.ARTICLE_GEN_MAX_INPUT_CHARS, 6000),
    maxEvidenceCount: num(process.env.ARTICLE_GEN_MAX_EVIDENCE, 12),
    maxEvidenceSummaryChars: num(process.env.ARTICLE_GEN_MAX_EVID_SUMMARY, 200),
    minSentenceLength: num(process.env.ARTICLE_GEN_MIN_SENTENCE, 6),
    supportTokenOverlap: num(process.env.ARTICLE_GEN_SUPPORT_OVERLAP, 1),
  };
}

export const PROMPT_VERSION = 'v1';
