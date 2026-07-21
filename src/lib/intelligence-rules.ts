import { load } from 'cheerio';
import entityConfig from '../../data/intelligence-entities.json';
import { IntelArticle, IntelligenceChannel } from './types';
import { normalizeTitle, normalizeUrl } from './feed-utils';

type Entity = { name: string; aliases?: string[]; group: string; code?: string };

const MEDIA_ENTITIES = entityConfig.media as Entity[];
const PE_ENTITIES = entityConfig.privateEquity as Entity[];

const PE_ALIASES: Record<string, string[]> = {
  红杉中国: ['红杉资本', '红杉', 'Sequoia China'],
  IDG资本: ['IDG Capital', 'IDG'],
  深创投集团: ['深创投', '深圳创新投'],
  高瓴投资: ['高瓴资本', '高瓴', 'Hillhouse'],
  达晨财智: ['达晨创投', '达晨投资'],
  君联资本: ['君联'],
  纪源资本: ['GGV Capital', 'GGV'],
  启明创投: ['启明'],
  中金资本: ['中金资本管理'],
  招商资本: ['招商局资本'],
  CPE源峰: ['源峰资本', 'CPE'],
  鼎晖投资: ['鼎晖'],
  腾讯投资: ['Tencent Investment'],
  阿里资本: ['阿里巴巴投资', '阿里投资'],
  淡马锡: ['Temasek'],
  摩根士丹利: ['Morgan Stanley', '摩根斯坦利'],
  德同资本: ['德同', 'Detong Capital', 'dtcap'],
};

const MEDIA_RULES = [
  { priority: 'P0', dimension: '重大战略投资', words: ['投资', '收购', '并购', '建设项目', 'AI布局', '人工智能', '对外投资'] },
  { priority: 'P0', dimension: '人事变动', words: ['董事长', '总经理', '总编辑', '辞职', '任命', '聘任', '高管'] },
  { priority: 'P0', dimension: '财报发布', words: ['财报', '年度报告', '季报', '营收', '净利润', '业绩预告', '利润分配', '权益分派', '业绩说明会'] },
  { priority: 'P1', dimension: '战略合作', words: ['签约', '合作', '战略协议', '入驻', '联合'] },
  { priority: 'P1', dimension: '业务转型', words: ['数字化', '新媒体', 'AI', 'AIGC', '转型', '升级', '大模型', '数据'] },
  { priority: 'P1', dimension: '政策响应', words: ['入选', '获批', '政策扶持', '国家级', '省级', '项目'] },
  { priority: 'P2', dimension: '股权变动', words: ['增持', '减持', '质押', '无偿划转', '股份转让', '权益变动'] },
  { priority: 'P2', dimension: '诉讼/监管', words: ['诉讼', '处罚', '问询', '监管', '警示', '公开谴责'] },
  { priority: 'P2', dimension: '治理事项', words: ['股东会', '董事会', '薪酬方案', '持续督导'] },
] as const;

const PE_RULES = [
  { priority: 'P0', dimension: '基金募集动态', label: '募资进展与资金来源', words: ['首关', '终关', '目标规模', '认缴', '募资完成', '募资关闭', '新设基金', '管理规模', '出资人', 'LP', '政府引导基金', '母基金', 'FOF', '基金备案', '管理人登记'] },
  { priority: 'P0', dimension: '投资组合与交易动态', label: '新增投资与项目退出', words: ['新增投资', '领投', '跟投', '联合投资', '天使轮', 'Pre-A', 'A轮', 'B轮', 'C轮', 'D轮', '融资', '估值', 'IPO', '上市', '过会', '并购', '收购', '回购', '退出'] },
  { priority: 'P1', dimension: '已投项目投后管理', label: '项目经营与治理', words: ['投后管理', '被投企业', '后续融资', '董事会', '监事会', '对赌条款', '创始人变更', '核心团队', '重大诉讼', '经营异常', '破产', '清算', '违约'] },
  { priority: 'P1', dimension: '组织与团队建设', label: '人事变动与组织架构', words: ['合伙人', '董事总经理', '投资总监', '入职', '离职', '晋升', '任命', '辞职', '加盟', '团队扩张', '投资委员会', '投委会', '组织架构', '裁员'] },
  { priority: 'P2', dimension: '品牌与行业影响力', label: '排名奖项与公开活动', words: ['行业排名', '榜单', '获奖', '荣誉', '评选', '行业峰会', '论坛', '主题演讲', '圆桌', '行业研究报告', '白皮书', '媒体专访'] },
  { priority: 'P2', dimension: '战略动向与合作关系', label: '战略合作与区域布局', words: ['战略合作', '战略协议', '区域办公室', '分支机构', '地方政府', '产业基金', '区域基金', '新赛道', '专项基金', '重点布局', '投资方向', '策略调整'] },
  { priority: 'P2', dimension: '合规与监管动态', label: '监管检查与合规事件', words: ['监管检查', '现场检查', '自律核查', '备案', '管理人变更', '行政处罚', '监管措施', '纪律处分', '证监局', '基金业协会', '中基协', '警示', '整改', '异常机构', '注销', '撤销登记'] },
] as const;

const MEDIA_BUSINESS_SIGNAL = new RegExp(MEDIA_RULES.flatMap(rule => rule.words).join('|'), 'i');
const PE_BUSINESS_SIGNAL = new RegExp(PE_RULES.flatMap(rule => rule.words).join('|'), 'i');
const STRONG_PRIMARY_MARKET_SIGNAL = /私募股权|股权投资|创业投资|创投|PE\/VC|VC基金|GP\b|LP\b|基金(?:募集|设立|成立|备案|首关|终关|出资)|(?:天使|种子|Pre-[A-H]|[A-H])轮融资|融资(?:完成|获投)|领投|跟投|投后管理|基金管理人/i;
const ROUTINE_GOVERNANCE_NOISE = /(?:董监高|董事|监事|独立董事|高级管理人员).{0,12}(?:辞职|离任|任命|聘任|变更|调整|换届)|(?:股东大会|股东会|董事会|监事会).{0,16}(?:召开|决议|会议|通知|议案)|独立董事述职|董事会工作报告|监事会工作报告|薪酬方案|候选人声明|法律意见书|持续督导/i;
const BUSINESS_AND_TRANSACTION_FOCUS = /融资|募资|首关|终关|基金(?:设立|成立|募集|出资)|领投|跟投|联合投资|战略投资|对外投资|新增投资|投资于|并购|收购|出售资产|资产重组|股权转让|项目退出|IPO|上市|过会|回购|签约|战略合作|中标|订单|客户|产品(?:发布|上线|量产)|业务(?:拓展|转型|布局|增长)|营收|净利润|业绩增长|市场份额|建设项目|破产|清算/i;
const DISCIPLINE_GOSSIP = /纪委|监委|审查调查|开除党籍|双开|严重违纪|受贿|贪污|被查/;
const SCRIPT_ARTIFACT = /showPlayer\s*\(|scriptId\s*:|videoInfo\s*:|window\.__|document\.(?:write|getElementById)|function\s*\(|<script/i;

function entitiesFor(channel: IntelligenceChannel): Entity[] {
  return channel === 'media' ? MEDIA_ENTITIES : PE_ENTITIES;
}

function aliasesFor(entity: Entity, channel: IntelligenceChannel): string[] {
  const aliases = [entity.name, ...(entity.aliases || [])];
  if (entity.code) aliases.push(entity.code);
  if (channel === 'private-equity') aliases.push(...(PE_ALIASES[entity.name] || []));
  return aliases;
}

function textContainsAlias(text: string, alias: string): boolean {
  if (!alias) return false;
  if (/^[a-z0-9 .+&/()-]+$/i.test(alias)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
  }

  const haystack = text.toLocaleLowerCase('zh-CN');
  const needle = alias.toLocaleLowerCase('zh-CN');
  if (needle.length > 4) return haystack.includes(needle);

  let start = haystack.indexOf(needle);
  while (start >= 0) {
    const trailing = haystack.slice(start + needle.length);
    if (
      !trailing
      || /^[\s、，。；：:（）()《》【】\[\]“”"'·/+-]/.test(trailing)
      || /^(?:资本|基金|创投|投资|宣布|完成|领投|跟投|参与|出资|募资|募集|设立|退出|减持|任命|离职|加盟|获奖|签约|合作|备案|处罚|被投)/.test(trailing)
    ) {
      return true;
    }
    start = haystack.indexOf(needle, start + 1);
  }
  return false;
}

export function resolveEntity(text: string, channel: IntelligenceChannel): Entity | undefined {
  const candidates = entitiesFor(channel).flatMap(entity =>
    aliasesFor(entity, channel)
      .filter(alias => alias.length >= 2 && textContainsAlias(text, alias))
      .map(alias => ({ entity, aliasLength: alias.length })),
  );

  candidates.sort((a, b) => b.aliasLength - a.aliasLength || a.entity.name.localeCompare(b.entity.name, 'zh-CN'));
  return candidates[0]?.entity;
}

export function entityByName(name: string | undefined, channel: IntelligenceChannel): Entity | undefined {
  if (!name) return undefined;
  return entitiesFor(channel).find(entity => entity.name === name);
}

export function cleanIntelligenceText(value: string | undefined, limit = 260): string {
  if (!value) return '';

  let input = String(value)
    .replace(/<!\[CDATA\[|\]\]>/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const artifactIndex = input.search(SCRIPT_ARTIFACT);
  if (artifactIndex >= 0) input = input.slice(0, artifactIndex);

  const dom = load(`<div id="intel-clean-root">${input}</div>`);
  dom('script, style, noscript, template, svg, video, audio, iframe, object, canvas').remove();

  let text = dom('#intel-clean-root').text()
    .replace(/\{\s*["']?(?:scriptId|videoInfo)[\s\S]*$/i, ' ')
    .replace(/(?:var|const|let)\s+[A-Za-z_$][\w$]*\s*=\s*[\s\S]*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (SCRIPT_ARTIFACT.test(text)) text = text.slice(0, text.search(SCRIPT_ARTIFACT)).trim();
  if (/^[{}[\]();,:='"\s\w.-]+$/.test(text) && /(?:script|video|src|player)/i.test(text)) return '';
  if (text.length > limit) text = `${text.slice(0, limit - 1).trimEnd()}…`;
  return text;
}

export function normalizePublishedAt(value: string | undefined): string | null {
  if (!value || /invalid\s*date|日期未标明/i.test(value)) return null;
  const normalized = value
    .replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/, '$1-$2-$3')
    .trim();
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 2000 || date.getTime() > Date.now() + 2 * 86400_000) return null;
  return date.toISOString();
}

function extractDateFromUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    { regex: /\/a\/(\d{4})(\d{2})(\d{2})\d*\./, groups: [1, 2, 3] },        // eastmoney
    { regex: /\/p(\d{4})(\d{2})(\d{2})\d*\./, groups: [1, 2, 3] },          // cfi
    { regex: /\/finalpage\/(\d{4})-(\d{2})-(\d{2})\//, groups: [1, 2, 3] }, // cninfo
    { regex: /\/(\d{4})[\/-](\d{2})[\/-](\d{2})[\/-]/, groups: [1, 2, 3] }, // WordPress/generic
  ];
  for (const { regex, groups } of patterns) {
    const match = url.match(regex);
    if (match) {
      const date = normalizePublishedAt(
        `${match[groups[0]]}-${match[groups[1]]}-${match[groups[2]]}`,
      );
      if (date) return date;
    }
  }
  return null;
}

function extractDateFromTitle(title: string): string | null {
  if (!title) return null;
  const exact = title.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (exact) {
    const date = normalizePublishedAt(`${exact[1]}-${exact[2]}-${exact[3]}`);
    if (date) return date;
  }
  const quarter = title.match(/(\d{4})年(一季报|半年报|三季报|年报)/);
  if (quarter) {
    const year = quarter[1];
    const report = quarter[2];
    const deadline: Record<string, string> = {
      '一季报': `${year}-04-30`,
      '半年报': `${year}-08-31`,
      '三季报': `${year}-10-31`,
      '年报': `${String(parseInt(year, 10) + 1)}-03-31`,
    };
    const date = normalizePublishedAt(deadline[report]);
    if (date) return date;
  }
  return null;
}

export function extractBestPublishedAt(
  item: {
    published?: string | null;
    url?: string | null;
    title?: string | null;
    generatedAt?: string | null;
  },
  nowHint?: string,
): string | null {
  const urlDate = extractDateFromUrl(item.url || '');
  const titleDate = extractDateFromTitle(item.title || '');
  const publishedNormalized = item.published ? normalizePublishedAt(item.published) : null;

  const generatedAtTime = item.generatedAt ? new Date(item.generatedAt).getTime() : NaN;
  const nowTime = nowHint ? new Date(nowHint).getTime() : Date.now();

  if (publishedNormalized) {
    const publishedTime = new Date(publishedNormalized).getTime();
    const isGenerationTime =
      !Number.isNaN(generatedAtTime) && Math.abs(publishedTime - generatedAtTime) < 1000;
    const isVeryRecent = Math.abs(publishedTime - nowTime) < 3600_000;

    if (!isGenerationTime && !isVeryRecent) {
      return publishedNormalized;
    }

    // published is likely the report generation time (or an extremely recent default).
    // Prefer URL/title because they are intrinsic to the source.
    if (urlDate) return urlDate;
    if (titleDate) return titleDate;

    // If it is not exactly generation time, keep it as a last resort.
    if (!isGenerationTime) return publishedNormalized;
    return null;
  }

  return urlDate || titleDate || null;
}

export function classifyMedia(text: string): { priority: string; dimension: string; matrixLabel: string } | null {
  const rule = MEDIA_RULES.find(candidate => candidate.words.some(word => text.toLocaleLowerCase('zh-CN').includes(word.toLocaleLowerCase('zh-CN'))));
  return rule ? { priority: rule.priority, dimension: rule.dimension, matrixLabel: rule.dimension } : null;
}

export function classifyPrivateEquity(text: string): { priority: string; dimension: string; matrixLabel: string } | null {
  let best: typeof PE_RULES[number] | undefined;
  let bestScore = 0;
  for (const rule of PE_RULES) {
    const score = rule.words.filter(word => text.toLocaleLowerCase('zh-CN').includes(word.toLocaleLowerCase('zh-CN'))).length;
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }
  return best ? { priority: best.priority, dimension: best.dimension, matrixLabel: best.label } : null;
}

export function isMediaBusinessNews(text: string): boolean {
  if (ROUTINE_GOVERNANCE_NOISE.test(text) && !BUSINESS_AND_TRANSACTION_FOCUS.test(text)) return false;
  return MEDIA_BUSINESS_SIGNAL.test(text) && BUSINESS_AND_TRANSACTION_FOCUS.test(text);
}

export function isPrivateEquityBusinessNews(text: string, hasTrackedCompany: boolean): boolean {
  if (ROUTINE_GOVERNANCE_NOISE.test(text) && !BUSINESS_AND_TRANSACTION_FOCUS.test(text)) return false;
  if (DISCIPLINE_GOSSIP.test(text) && !PE_BUSINESS_SIGNAL.test(text)) return false;
  if (!BUSINESS_AND_TRANSACTION_FOCUS.test(text)) return false;
  return hasTrackedCompany ? PE_BUSINESS_SIGNAL.test(text) : STRONG_PRIMARY_MARKET_SIGNAL.test(text);
}

function sourceAuthority(item: IntelArticle): number {
  const source = `${item.source} ${item.url}`;
  if (/巨潮|基金业协会|中基协|cninfo|公告/i.test(source)) return 0;
  if (/人民网|新华网|央视|证券时报|中证网|中国证券报|财联社|36氪|投资界|新浪财经|21财经/i.test(source)) return 1;
  if (/自动抓取|Google News/i.test(`${item.matrixLabel} ${item.source}`)) return 3;
  return 2;
}

function canonicalEventSubject(value: string): string {
  let subject = value
    .replace(/^.*?(?:\d{4}年\d{1,2}月\d{1,2}日|近日|日前|据悉|据了解)/, '')
    .trim();
  const parenthetical = subject.match(/[（(]([^）)]{2,16})[）)]/);
  if (parenthetical) subject = parenthetical[1];
  subject = subject
    .replace(/^.*(?:研发商|服务商|供应商|制造商|运营商|企业|公司|品牌|平台|厂商)/, '')
    .replace(/(?:股份)?有限公司$/, '')
    .replace(/[^A-Za-z0-9\u00c0-\u024f\u3400-\u9fff·-]/g, '')
    .toLocaleLowerCase('zh-CN');
  if (
    subject.length < 2
    || subject.length > 16
    || /融资|投资|完成|宣布|头部|领域|消息|本轮|新一轮/.test(subject)
  ) return '';
  return subject;
}

function eventSubjectFromText(value: string): string {
  const patterns = [
    /([A-Za-z0-9\u00c0-\u024f\u3400-\u9fff·（）()\-]{2,30}?)(?:再次)?(?:宣布)?(?:完成|获得|获)(?:[^，。；;]{0,20}?)(?:融资|投资)/,
    /([A-Za-z0-9\u00c0-\u024f\u3400-\u9fff·（）()\-]{2,20})创始人/,
  ];
  for (const sentence of value.split(/[，,。；;：:！!?？|]/)) {
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (!match) continue;
      const subject = canonicalEventSubject(match[1]);
      if (subject) return subject;
    }
  }
  return '';
}

function eventSubject(article: IntelArticle): string {
  return eventSubjectFromText(article.title) || eventSubjectFromText(article.description);
}

function financingRound(article: IntelArticle): string {
  const match = `${article.title} ${article.description}`.match(/(?:Pre[- ]?[A-H]|[A-H]\+*|天使|种子|战略)轮/i);
  return (match?.[0] || '')
    .toLocaleLowerCase('zh-CN')
    .replace(/[- ]/g, '')
    .replace(/\+/g, 'plus');
}

function ngramDice(left: string, right: string, company: string): number {
  const normalize = (value: string) => value
    .toLocaleLowerCase('zh-CN')
    .replaceAll(company.toLocaleLowerCase('zh-CN'), '')
    .replace(/[^A-Za-z0-9\u00c0-\u024f\u3400-\u9fff]+/g, '');
  const grams = (value: string) => {
    const normalized = normalize(value);
    const output = new Set<string>();
    for (let index = 0; index < normalized.length - 1; index++) {
      output.add(normalized.slice(index, index + 2));
    }
    return output;
  };
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  if (leftGrams.size + rightGrams.size === 0) return 0;
  let shared = 0;
  leftGrams.forEach((gram) => {
    if (rightGrams.has(gram)) shared++;
  });
  return (2 * shared) / (leftGrams.size + rightGrams.size);
}

export function isLikelySameIntelligenceEvent(
  left: IntelArticle,
  right: IntelArticle,
  channel: IntelligenceChannel,
): boolean {
  if (left.company !== right.company || left.dimension !== right.dimension) return false;
  const leftTime = new Date(left.publishedAt).getTime();
  const rightTime = new Date(right.publishedAt).getTime();
  const daysApart = Math.abs(leftTime - rightTime) / 86400_000;
  if (!Number.isFinite(daysApart) || daysApart > 21) return false;

  if (channel === 'private-equity') {
    const leftSubject = eventSubject(left);
    const rightSubject = eventSubject(right);
    const leftRound = financingRound(left);
    const rightRound = financingRound(right);
    if (
      leftSubject
      && leftSubject === rightSubject
      && (!leftRound || !rightRound || leftRound === rightRound)
    ) return true;
  }

  // If no reliable event subject can be extracted, require unusually strong
  // headline similarity. Descriptions alone contain too much syndicated
  // boilerplate and can merge unrelated deals from the same institution.
  const titleSimilarity = ngramDice(left.title, right.title, left.company || '');
  if (titleSimilarity >= (channel === 'media' ? 0.8 : 0.72)) return true;
  const combinedSimilarity = ngramDice(
    `${left.title} ${left.description}`,
    `${right.title} ${right.description}`,
    left.company || '',
  );
  return daysApart <= 7 && titleSimilarity >= 0.35 && combinedSimilarity >= 0.82;
}

function mergeDuplicate(existing: IntelArticle, candidate: IntelArticle): IntelArticle {
  const existingAuthority = sourceAuthority(existing);
  const candidateAuthority = sourceAuthority(candidate);
  const preferred = candidateAuthority < existingAuthority
    ? candidate
    : existingAuthority < candidateAuthority
      ? existing
      : candidate.description.length > existing.description.length
        ? candidate
        : existing;
  const longerDescription = candidate.description.length > existing.description.length
    ? candidate.description
    : existing.description;
  return { ...preferred, description: longerDescription };
}

export function sanitizeIntelligenceArticle(
  article: IntelArticle,
  channel: IntelligenceChannel,
): IntelArticle | null {
  const title = cleanIntelligenceText(article.title, 180);
  let description = cleanIntelligenceText(article.description, 260);
  const publishedAt = normalizePublishedAt(article.publishedAt);
  const url = String(article.url || '').trim();
  if (!title || !publishedAt || !/^https?:\/\//i.test(url)) return null;
  if (Date.now() - new Date(publishedAt).getTime() > 120 * 86400_000) return null;
  if (description === title) description = '';

  const text = `${title} ${description}`.trim();
  if (ROUTINE_GOVERNANCE_NOISE.test(title) && !BUSINESS_AND_TRANSACTION_FOCUS.test(title)) return null;
  const matchedEntity = resolveEntity(text, channel);
  const declaredEntity = entityByName(article.company, channel);
  const isAutomatic = /自动抓取|RSS/i.test(`${article.matrixLabel || ''} ${article.companyGroup || ''}`)
    || article.id.startsWith('media-live-')
    || article.id.startsWith('pe-live-');

  if (channel === 'media') {
    // 非上市公司项由豆包/ RSS 检索管线预先打好了公司归属（companyGroup 为
    // “豆包联网搜索” / “RSS 非上市公司检索”，或 categories 含 “非上市公司”）。
    // 它们不在媒体实体注册表里，若走下面的实体解析会被整体丢弃。这里直接放行，
    // 保留其公司归属，不再强求媒体行业实体分类。
    const isNonListed = article.companyGroup === '豆包联网搜索'
      || article.companyGroup === 'RSS 非上市公司检索'
      || (article.categories || []).includes('非上市公司');
    if (isNonListed && article.company) {
      return {
        ...article,
        title,
        description,
        publishedAt,
        url,
        company: article.company,
        companyGroup: article.companyGroup === 'RSS 非上市公司检索' ? '非上市公司' : (article.companyGroup || '非上市公司'),
        categories: article.categories?.length ? article.categories : ['非上市公司', article.company],
        dimension: article.dimension && article.dimension !== '待分类' ? article.dimension : '非上市公司情报',
        matrixLabel: article.matrixLabel || '非上市公司情报',
        priority: article.priority || 'P2',
        credibility: article.credibility || '中高',
      };
    }
    const entity = isAutomatic ? matchedEntity : (declaredEntity || matchedEntity);
    if (!entity || !isMediaBusinessNews(text)) return null;
    const classification = classifyMedia(text);
    if (!classification) return null;
    return {
      ...article,
      title,
      description,
      publishedAt,
      url,
      company: entity.name,
      companyGroup: entity.group,
      categories: [entity.group, classification.dimension],
      priority: classification.priority,
      dimension: classification.dimension,
      matrixLabel: classification.matrixLabel,
      credibility: article.credibility || (/巨潮|公告/i.test(article.source) ? '高' : '中高'),
    };
  }

  // Keep a script-assigned institution only when the visible title/summary proves
  // that it is actually mentioned. This preserves the primary institution in
  // multi-party deals while rejecting legacy market-commentary false positives.
  const declaredEntityIsMentioned = declaredEntity
    ? text.includes(declaredEntity.name)
      || aliasesFor(declaredEntity, channel).some(alias => textContainsAlias(text, alias))
    : false;
  const entity = declaredEntityIsMentioned ? declaredEntity : matchedEntity;
  if (!entity || !isPrivateEquityBusinessNews(text, true)) return null;
  const classification = classifyPrivateEquity(text);
  if (!classification) return null;
  return {
    ...article,
    title,
    description,
    publishedAt,
    url,
    company: entity.name,
    companyGroup: entity.group,
    categories: [entity.group, classification.dimension],
    priority: classification.priority,
    dimension: classification.dimension,
    matrixLabel: classification.matrixLabel,
    credibility: article.credibility || '中高',
  };
}

export function sanitizeAndDedupeIntelligence(
  articles: IntelArticle[],
  channel: IntelligenceChannel,
): IntelArticle[] {
  const output: IntelArticle[] = [];
  const byTitle = new Map<string, number>();
  const byUrl = new Map<string, number>();
  const byEventBucket = new Map<string, number[]>();

  for (const raw of articles) {
    const item = sanitizeIntelligenceArticle(raw, channel);
    if (!item) continue;
    const titleKey = normalizeTitle(item.title);
    const urlKey = normalizeUrl(item.url);
    const eventBucketKey = `${item.company || ''}\u0000${item.dimension || ''}`;
    const eventBucket = byEventBucket.get(eventBucketKey) || [];
    const existingIndex = byTitle.get(titleKey)
      ?? byUrl.get(urlKey)
      ?? eventBucket.find(index => isLikelySameIntelligenceEvent(output[index], item, channel));

    if (existingIndex === undefined) {
      const index = output.push(item) - 1;
      byTitle.set(titleKey, index);
      byUrl.set(urlKey, index);
      eventBucket.push(index);
      byEventBucket.set(eventBucketKey, eventBucket);
      continue;
    }

    const existing = output[existingIndex];
    output[existingIndex] = mergeDuplicate(existing, item);
    byTitle.set(titleKey, existingIndex);
    byUrl.set(urlKey, existingIndex);
  }

  return output.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function qualityIssues(articles: IntelArticle[]): string[] {
  const issues: string[] = [];
  for (const article of articles) {
    if (SCRIPT_ARTIFACT.test(`${article.title} ${article.description}`)) issues.push(`${article.id}: script artifact`);
    if (!normalizePublishedAt(article.publishedAt)) issues.push(`${article.id}: invalid date`);
    if (!article.company) issues.push(`${article.id}: missing company`);
  }
  return issues;
}
