// 识澜·智稿 — 结构化事实提取（Fact Sheet 构建）
// 输入：证据列表 + 稿件类型（+ 可选主体提示）。
// 输出：Fact Sheet（§5）。
//
// 提取规则（§5 提取规则）：
//   1. 只提取证据中明确出现的事实；
//   2. 无法确认的字段设为 null；
//   3. 每条事实必须保留 source_ids；
//   4. 金额/日期/比例/轮次必须单独校验（交冲突检测）；
//   5. 不允许根据常识自动补全；
//   6. 标题中的推测不直接写成事实。
//
// 采用正则从“标题 + 摘要”中提取金额/日期/轮次/投资方/股权/主体，
// 全部字段都带来源 id，再交给 conflict-detector 做一致性判定。

import type { ArticleType, ConfirmedFact, EvidenceItem, FactSheet } from './types';
import { detectConflicts, isSingleSourceRepost, type FieldFindings, type RawFact } from './conflict-detector';

const AMOUNT_RE = /(\d+(?:\.\d+)?)\s*(?:余|多|约|近|超|超过)?\s*(亿|万)?\s*(元|人民币|美元|港元|港币|英镑|欧元)/g;
const DATE_RE = /(\d{4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日|\d{4}\s*年\s*\d{1,2}\s*月|\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\s*月\s*\d{1,2}\s*日)/g;
const ROUND_RE = /(天使轮|种子轮|Pre-?[A-D]\+?轮|[A-D]\+?轮|战略融资|战略投资|并购|新三板|IPO|借壳上市|股权转让|增资扩股)/g;
const EQUITY_RE = /(\d+(?:\.\d+)?\s*%)/g;
const INVEST_RE = /(?:由|获|得到|引入)?\s*([^，。；、\s]{2,20}?)\s*(?:领投|跟投|独家投资|战略投资|出资|参投)/g;
const ORG_RE = /([^，。；、\s]{2,20}?(?:公司|集团|科技|股份|有限公司|银行|基金|资本|投资|控股|企业|大学|研究所|实验室|中心|协会|政府|平台|网络|传媒|能源|生物|医疗|半导体|汽车|电子|智能|数据|云|证券|保险))/g;
const LOCATION_RE = /(北京|上海|广州|深圳|广东|粤港澳大湾区|大湾区|浙江|江苏|四川|重庆|天津|武汉|杭州|南京|成都|香港|中国台湾|中国澳门|全国)/g;

function findAll(re: RegExp, text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0].trim());
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/** 把同一字段下、每条发现的 value 与来源聚合为 FieldFindings。 */
function toFieldFindings(field: string, items: { value: string; sourceId: string }[]): FieldFindings {
  return { field, findings: items.map((i) => ({ value: i.value, sourceId: i.sourceId }) as RawFact) };
}

export interface BuildFactSheetOptions {
  /** 主体提示（通常来自选题卡标题），无法从证据提取主体时使用。 */
  subjectHint?: string;
}

export function buildFactSheet(
  evidence: EvidenceItem[],
  articleType: ArticleType,
  opts: BuildFactSheetOptions = {},
): FactSheet {
  const generic: Record<string, { value: string; sourceId: string }[]> = {
    主体: [],
    金额: [],
    日期: [],
    轮次: [],
    投资方: [],
    股权比例: [],
    地点: [],
  };

  const orgs: string[] = [];
  const locations: string[] = [];

  for (const e of evidence) {
    const sid = e.id;
    const text = `${e.title || ''} ${e.summary || ''}`;
    for (const v of findAll(AMOUNT_RE, text)) generic.金额.push({ value: v, sourceId: sid });
    for (const v of findAll(DATE_RE, text)) generic.日期.push({ value: v, sourceId: sid });
    for (const v of findAll(ROUND_RE, text)) generic.轮次.push({ value: v, sourceId: sid });
    for (const v of findAll(EQUITY_RE, text)) generic.股权比例.push({ value: v, sourceId: sid });
    for (const m of text.matchAll(INVEST_RE)) generic.投资方.push({ value: m[1].trim(), sourceId: sid });
    for (const m of text.matchAll(ORG_RE)) { generic.主体.push({ value: m[1].trim(), sourceId: sid }); orgs.push(m[1].trim()); }
    for (const v of findAll(LOCATION_RE, text)) locations.push(v);
  }

  // 冲突检测（按通用字段）
  const fields: FieldFindings[] = [
    toFieldFindings('主体', generic.主体),
    toFieldFindings('金额', generic.金额),
    toFieldFindings('日期', generic.日期),
    toFieldFindings('轮次', generic.轮次),
    toFieldFindings('投资方', generic.投资方),
    toFieldFindings('股权比例', generic.股权比例),
    toFieldFindings('地点', generic.地点),
  ];
  const { confirmed, conflicting, unverified } = detectConflicts(fields);

  const confirmedMap = new Map<string, string>();
  for (const c of confirmed) if (c.value) confirmedMap.set(c.field, c.value);
  const conflictingMap = new Map<string, string>();
  for (const c of conflicting) if (c.value) conflictingMap.set(c.field, c.value);

  // 主体：优先使用提示；否则取出现最多的主体
  let subject = opts.subjectHint?.trim() || '';
  if (!subject && orgs.length > 0) {
    const freq = new Map<string, number>();
    for (const o of orgs) freq.set(o, (freq.get(o) || 0) + 1);
    subject = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  const eventType = articleTypeLabel(articleType);
  const eventDate = confirmedMap.get('日期') || '';
  const location = locations[0] || '';

  // 按稿件类型映射为结构化字段（§5）
  const fieldsOut: Record<string, string | null> = buildTypedFields(articleType, confirmedMap, conflictingMap);

  const sourceIds = evidence.map((e) => e.id);
  const entities = [...new Set(orgs)];

  const factSheet: FactSheet = {
    subject,
    eventType,
    eventDate,
    location,
    confirmedFacts: confirmed,
    conflictingFacts: conflicting,
    unverifiedFacts: unverified,
    entities,
    sourceIds,
    fields: fieldsOut,
  };

  // 同源转载提示：作为待核实事实追加（不伪造正文）
  if (isSingleSourceRepost(evidence)) {
    factSheet.unverifiedFacts.push({
      field: '来源',
      value: null,
      sourceIds: sourceIds.slice(0, 1),
    });
  }

  return factSheet;
}

function articleTypeLabel(t: ArticleType): string {
  const m: Record<ArticleType, string> = {
    flash_news: '财经快讯',
    standard_news: '标准财经新闻',
    financing_news: '投融资',
    ma_news: '并购重组',
    company_news: '公司业务动态',
    bid_news: '中标与签约',
    market_overview: '大盘综述',
  };
  return m[t];
}

/** 将通用提取字段映射为各稿件类型的结构化字段（缺失置 null）。 */
function buildTypedFields(
  t: ArticleType,
  confirmed: Map<string, string>,
  conflicting: Map<string, string>,
): Record<string, string | null> {
  const pick = (generic: string): string | null => conflicting.get(generic) ?? confirmed.get(generic) ?? null;
  switch (t) {
    case 'financing_news':
      return {
        融资主体: pick('主体'),
        融资轮次: pick('轮次'),
        融资金额: pick('金额'),
        投资机构: pick('投资方'),
        融资时间: pick('日期'),
        资金用途: null,
        公司主营业务: null,
        历史融资: null,
      };
    case 'ma_news':
      return {
        收购方: pick('主体'),
        被收购方: null,
        交易金额: pick('金额'),
        股权比例: pick('股权比例'),
        交易方式: null,
        交易目的: null,
        审批状态: null,
        交割状态: null,
      };
    case 'company_news':
      return {
        公司主体: pick('主体'),
        业务动作: null,
        产品或业务名称: null,
        合作对象: pick('投资方'),
        发生时间: pick('日期'),
        涉及地区: pick('地点'),
        战略目的: null,
      };
    case 'bid_news':
      return {
        中标主体: pick('主体'),
        项目名称: null,
        招标单位: pick('投资方'),
        项目金额: pick('金额'),
        项目周期: null,
        服务内容: null,
        公告时间: pick('日期'),
      };
    case 'standard_news':
    case 'flash_news':
    default:
      return {
        主体: pick('主体'),
        事件: null,
        时间: pick('日期'),
        地点: pick('地点'),
      };
  }
}
