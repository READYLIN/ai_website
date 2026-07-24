// 识澜·智稿 — 规则回退生成器
// 在没有 LLM Key / Mock 模式下，或模型输出非法 JSON 时，使用本生成器产出
// 合法、可追溯、不编造的结构化稿件初稿（§7 规则回退 + §14 Mock 无 Key 可运行）。
//
// 原则：只使用 Fact Sheet 与证据中明确出现的事实；无法确认处写明“需核实”；
// 重要事实关联证据编号；绝不编造金额/日期/投资方/人物。

import type { ArticleDraft, ArticleSection, EvidenceItem, FactSheet, GenerateOptions } from './types';
import { ARTICLE_TYPE_LABELS } from './config';

function field(factSheet: FactSheet, key: string): string {
  const v = factSheet.fields[key];
  return v && v.trim().length > 0 ? v : '';
}

function confirmedValue(factSheet: FactSheet, field: string): string {
  const f = factSheet.confirmedFacts.find((c) => c.field === field && c.value);
  return f?.value ?? '';
}

/** 汇总待核实事项（冲突 + 无法确认）。 */
function buildUnverified(factSheet: FactSheet): string[] {
  const out: string[] = [];
  for (const c of factSheet.conflictingFacts) {
    if (c.value) out.push(`${c.field}存在多方不一致（${c.value}），请人工核实后选用。`);
  }
  for (const u of factSheet.unverifiedFacts) {
    out.push(`${u.field || '相关事实'}无法从现有证据确认，需补充核实。`);
  }
  if (out.length === 0) out.push('暂无未确认事项（以现有证据为准）。');
  return out;
}

/** 汇总风险提示。 */
function buildRiskNotes(factSheet: FactSheet): string[] {
  const out: string[] = [];
  if (factSheet.conflictingFacts.length > 0) out.push('部分关键事实存在来源冲突，发布前须交叉核实。');
  if (factSheet.sourceIds.length <= 1) out.push('目前仅单一来源，建议补充权威信源后再发布。');
  out.push('本稿为 AI 生成初稿，重要数据须经人工核对原始证据。');
  return out;
}

function makeSection(heading: string, content: string, evidenceIds: string[]): ArticleSection {
  return { heading, content, evidenceIds };
}

/** 按稿件类型生成段落（§8 模板，内容严格基于 Fact Sheet）。 */
function buildSections(factSheet: FactSheet, evidenceIds: string[], type: GenerateOptions['articleType']): ArticleSection[] {
  const subject = factSheet.subject || '相关主体';
  const amount = field(factSheet, '融资金额') || field(factSheet, '交易金额') || field(factSheet, '项目金额') || confirmedValue(factSheet, '金额');
  const round = field(factSheet, '融资轮次') || confirmedValue(factSheet, '轮次');
  const investor = field(factSheet, '投资机构') || field(factSheet, '招标单位') || confirmedValue(factSheet, '投资方');
  const date = factSheet.eventDate || confirmedValue(factSheet, '日期');
  const equity = field(factSheet, '股权比例') || confirmedValue(factSheet, '股权比例');

  const sections: ArticleSection[] = [];
  const sec = (h: string, c: string) => sections.push(makeSection(h, c, evidenceIds));

  switch (type) {
    case 'financing_news':
      sec('融资事件', `${subject}${round ? `完成${round}融资` : '近期完成一轮融资'}${date ? `，${date}相关消息发布` : ''}。${investor ? `本轮由${investor}参与。` : '投资方尚未从证据中明确。'}`);
      sec('融资金额与轮次', amount ? `据证据，融资金额约为${amount}。${round ? `轮次为${round}。` : ''}` : '融资金额未能从现有证据中确认，需核实。');
      sec('投资方', investor ? `投资方包括${investor}。` : '现有证据未明确列出投资方，需补充核实。');
      sec('资金用途', '资金用途未在证据中明确披露，需向企业核实。');
      sec('公司业务', `${subject}主营业务未在证据中详述，建议补充公司简介。`);
      sec('后续观察', '后续可关注工商变更、资金到账与业务落地进展。');
      break;
    case 'ma_news':
      sec('交易概况', `${subject}近期涉及并购交易${date ? `，${date}前后有相关披露` : ''}。${amount ? `交易金额约为${amount}。` : '交易金额未明确。'}`);
      sec('交易双方', `${subject}为本次交易相关方。${equity ? `涉及股权比例约${equity}。` : '交易对方与股权比例需进一步核实。'}`);
      sec('金额与股权比例', amount || equity ? `交易金额${amount || '未披露'}，股权比例${equity || '未披露'}。` : '金额与股权比例均待核实。');
      sec('交易目的', '交易目的未在证据中明确，建议结合双方战略表述。');
      sec('审批与交割', '审批状态与交割进度需以监管公告为准。');
      sec('风险事项', '并购存在审批、估值与整合风险，须持续跟踪。');
      break;
    case 'company_news':
      sec('业务动作', `${subject}近期有业务动态${date ? `，${date}前后发布相关信息` : ''}。`);
      sec('产品或合作内容', '具体产品、合作内容未在证据中详述，需核实。');
      sec('公司背景', `${subject}为本次动态的主体，主营业务与背景建议补充。`);
      sec('业务意义', '该动态对行业竞争格局的影响有待观察。');
      sec('待观察事项', '后续关注落地进展与官方进一步披露。');
      break;
    case 'bid_news':
      sec('中标或签约概况', `${subject}${date ? `于${date}` : ''}发布中标或签约相关信息。`);
      sec('项目金额', amount ? `项目金额约为${amount}。` : '项目金额未从证据中明确，需核实。');
      sec('项目内容', '项目具体服务内容与范围需以公告原文为准。');
      sec('合作主体', investor ? `合作/招标方为${investor}。` : '合作主体信息待补充。');
      sec('项目周期', '项目周期未在证据中披露。');
      sec('业务意义', '该项目对中标签约方的业务拓展具有参考意义。');
      break;
    case 'flash_news':
      sec('核心事实', `${subject}${round ? `完成${round}融资` : '发布相关动态'}${amount ? `，金额约${amount}` : ''}${date ? `（${date}）` : ''}。具体以证据为准。`);
      sec('来源', `本快讯依据 ${factSheet.sourceIds.length} 条证据生成，详见右侧来源列表。`);
      sec('待核实事项', buildUnverified(factSheet).join('；'));
      break;
    case 'market_overview':
      sec('大盘指数表现', `截至${factSheet.eventDate || '最新交易日'}，主要指数（上证指数、深证成指、创业板指、沪深300、科创50 等）涨跌幅与成交量见右侧证据。`);
      sec('涨跌家数', `全市场上涨、下跌、平盘家数见右侧证据；若免费源暂不可用，请以交易所官方披露为准。`);
      sec('市场解读', '结合指数表现与个股涨跌分布，观察市场风格与板块强弱；本稿仅基于证据整理，不构成投资建议。');
      sec('后续观察', '关注成交能否持续放量、板块轮动与政策面变化。');
      sec('来源', `本稿依据 ${factSheet.sourceIds.length} 条证据（指数与涨跌家数）生成。`);
      sec('待核实事项', buildUnverified(factSheet).join('；'));
      break;
    case 'standard_news':
    default:
      sec('事件详情', `${subject}近期发生相关事件${date ? `，${date}前后有信息披露` : ''}。${amount ? `涉及金额约${amount}。` : ''}`);
      sec('主体背景', `${subject}为本次事件主体，背景资料建议补充。`);
      sec('业务意义', '事件对行业与市场的意义有待进一步观察。');
      sec('后续观察', '后续关注官方披露与权威媒体报道。');
      sec('来源', `本稿依据 ${factSheet.sourceIds.length} 条证据生成。`);
      sec('待核实事项', buildUnverified(factSheet).join('；'));
      break;
  }
  return sections;
}

/** 生成 3 个备选标题。 */
function buildTitles(factSheet: FactSheet, type: GenerateOptions['articleType']): string[] {
  const subject = factSheet.subject || '相关企业';
  const amount = field(factSheet, '融资金额') || field(factSheet, '交易金额') || field(factSheet, '项目金额');
  const round = field(factSheet, '融资轮次');
  const label = ARTICLE_TYPE_LABELS[type];
  const t1 = `${subject}${round ? `完成${round}融资` : '发布最新动态'}${amount ? `，金额约${amount}` : ''}`;
  const t2 = `${label}｜${subject}近期动作引发关注`;
  const t3 = `${subject}：${round ? `${round}融资` : '最新业务进展'}背后的信号`;
  return [t1, t2, t3];
}

/** 生成导语。 */
function buildLead(factSheet: FactSheet): string {
  const subject = factSheet.subject || '相关主体';
  const amount = field(factSheet, '融资金额') || field(factSheet, '交易金额') || field(factSheet, '项目金额');
  const round = field(factSheet, '融资轮次');
  return `${subject}${round ? `近期完成${round}融资` : '近期发布相关动态'}${amount ? `，涉及金额约${amount}` : ''}，本稿依据已抓取证据整理，发布前须人工审核。`;
}

/** 规则回退 / Mock：从 Fact Sheet 直接生成结构化稿件。 */
export function buildArticleDraftFromFactSheet(
  factSheet: FactSheet,
  evidence: EvidenceItem[],
  options: GenerateOptions,
): ArticleDraft {
  const evidenceIds = factSheet.sourceIds.length > 0 ? factSheet.sourceIds : evidence.map((e) => e.id);
  const sections = buildSections(factSheet, evidenceIds, options.articleType);
  const bodyText = sections.map((s) => `${s.heading}\n${s.content}`).join('\n\n');

  return {
    titles: options.includeAlternativeTitles ? buildTitles(factSheet, options.articleType) : [buildTitles(factSheet, options.articleType)[0]],
    lead: options.includeLead ? buildLead(factSheet) : '',
    sections,
    unverifiedItems: buildUnverified(factSheet),
    riskNotes: buildRiskNotes(factSheet),
    sourceIds: evidenceIds,
    articleType: options.articleType,
    style: options.style,
  };
}

/** 仅重生成标题（保留其余）。 */
export function buildTitlesOnly(factSheet: FactSheet, options: GenerateOptions): string[] {
  return buildTitles(factSheet, options.articleType);
}

/** 仅重生成导语。 */
export function buildLeadOnly(factSheet: FactSheet): string {
  return buildLead(factSheet);
}
