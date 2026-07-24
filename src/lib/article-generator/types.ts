// 识澜·智稿 — 类型定义
// 覆盖稿件类型/风格、Fact Sheet、结构化稿件、事实核查、版本等完整数据契约。

/** 支持的稿件类型（与 §2 配置窗口一一对应）。 */
export type ArticleType =
  | 'flash_news'      // 财经快讯
  | 'standard_news'   // 标准财经新闻
  | 'financing_news'  // 投融资新闻
  | 'ma_news'         // 并购新闻
  | 'company_news'    // 公司动态
  | 'bid_news'        // 中标与签约新闻
  | 'market_overview'; // 大盘综述（全市场指数 + 涨跌家数）

/** 写作风格（与 §2 对应）。 */
export type ArticleStyle =
  | 'objective'          // 客观新闻体
  | 'financial_media'    // 财经媒体体
  | 'guangzhou_local'    // 广州本地媒体体
  | 'investment_brief';  // 投资研究简报体

/** 稿件状态（§12 版本与保存）。 */
export type ArticleStatus = 'draft' | 'published';

/** 逐句核查支持状态（§9）。 */
export type SupportStatus =
  | 'supported'            // 绿色：有直接证据
  | 'partially_supported'  // 黄色：部分支持，建议复核
  | 'unsupported'          // 红色：未找到充分证据
  | 'background';          // 蓝色：背景性描述

/** 核查整体状态。 */
export type VerificationStatus = 'unverified' | 'partial' | 'verified' | 'failed';

/** 重新生成模式（§10）。 */
export type RegenerateMode =
  | 'full'
  | 'title'
  | 'lead'
  | 'section'
  | 'shorten'
  | 'expand'
  | 'convert_to_brief';

/** 证据文章（复用观潮的 EvidenceArticle 形状，避免跨模块类型耦合）。 */
export interface EvidenceItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  sourceType?: string;
}

/** 用户手填的证据（不来自数据库），用于「新建内容」自由创作。 */
export interface InlineEvidenceItem {
  /** 证据标题（必填，至少要有标题或内容其一） */
  title: string;
  /** 正文/摘要文本，是 Fact Sheet 提取的主料 */
  content?: string;
  /** 来源名（选填，缺省标记「用户手填」） */
  source?: string;
  /** 原文链接（选填） */
  url?: string;
  /** 发布时间（选填，任意可排序字符串如 2026-07-23） */
  publishedAt?: string;
}

/** 一条经提取/确认的事实，必须保留来源溯源。 */
export interface ConfirmedFact {
  /** 字段名，如 金额/日期/轮次/融资主体/投资方 */
  field: string;
  /** 提取值，无法确认置 null */
  value: string | null;
  /** 支持该事实的证据 id 列表 */
  sourceIds: string[];
}

/** Fact Sheet（§5）：生成新闻前必须先构建。 */
export interface FactSheet {
  subject: string;
  eventType: string;
  eventDate: string;
  location: string;
  /** 明确出现的事实 */
  confirmedFacts: ConfirmedFact[];
  /** 存在冲突的事实（多方说法不一） */
  conflictingFacts: ConfirmedFact[];
  /** 无法确认、需人工核实的事实 */
  unverifiedFacts: ConfirmedFact[];
  /** 涉及实体 */
  entities: string[];
  /** 来源 id 列表 */
  sourceIds: string[];
  /** 按稿件类型细化的结构化字段（financing/ma/company/bid） */
  fields: Record<string, string | null>;
}

/** 稿件正文的一个段落（§7 模型输出）。 */
export interface ArticleSection {
  heading: string;
  content: string;
  /** 该段落关联的证据编号（news id） */
  evidenceIds: string[];
}

/** 模型（或规则回退）产出的结构化稿件。 */
export interface ArticleDraft {
  titles: string[];
  lead: string;
  sections: ArticleSection[];
  unverifiedItems: string[];
  riskNotes: string[];
  sourceIds: string[];
  articleType: ArticleType;
  style: ArticleStyle;
}

/** 单句核查结果（§9）。 */
export interface FactCheckItem {
  sentenceIndex: number;
  sentenceText: string;
  supportStatus: SupportStatus;
  supportingNewsIds: string[];
  explanation: string;
  confidenceScore: number; // 0-100
}

/** 写入数据库的完整稿件记录。 */
export interface GeneratedArticleRecord {
  id: string;
  topicCardId: string;
  topicId: string;
  articleType: ArticleType;
  style: ArticleStyle;
  targetLength: number;
  title: string;
  alternativeTitles: string[];
  leadText: string;
  bodyText: string;
  sections: ArticleSection[];
  factSheet: FactSheet;
  unverifiedItems: string[];
  riskNotes: string[];
  sourceIds: string[];
  verificationStatus: VerificationStatus;
  modelName: string | null;
  promptVersion: string | null;
  status: ArticleStatus;
  version: number;
  isLatest: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** 生成请求选项（§2 配置窗口 + §10）。 */
export interface GenerateOptions {
  articleType: ArticleType;
  targetLength: number;
  style: ArticleStyle;
  includeBackground: boolean;
  includeRiskNotes: boolean;
  includeAlternativeTitles: boolean;
  includeLead: boolean;
  includeSource: boolean;
  /** 可选：只使用勾选的证据（news id 白名单）。缺省 = 用选题卡全部证据。 */
  evidenceIds?: string[];
}

/** 重新生成请求。 */
export interface RegenerateOptions {
  mode: RegenerateMode;
  /** section 模式下的段落下标 */
  sectionIndex?: number;
  /** 覆盖生成选项（shorten/expand/convert_to_brief 用） */
  targetLength?: number;
  articleType?: ArticleType;
}

/** 人工保存（PATCH）的字段。 */
export interface ArticlePatch {
  title?: string;
  alternativeTitles?: string[];
  leadText?: string;
  bodyText?: string;
  sections?: ArticleSection[];
  unverifiedItems?: string[];
  riskNotes?: string[];
  status?: ArticleStatus;
}
