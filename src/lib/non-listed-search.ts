import { IntelArticle } from './types';
import { fetchMediaArticles } from './media-fetcher';
import { nonListedCompanies } from './non-listed-companies';
import { withTtlCache } from './feed-utils';

/**
 * 非上市公司 RSS 检索。
 *
 * 名单内多数内容机构（正午阳光 / 柠萌影业 / 耀客传媒 / 华人文化集团）没有
 * 原生 RSS，因此不逐一配置 Feed，而是在「现有新闻媒源 RSS 流」里按公司名 /
 * 别名做提及检索；财新等自带 Feed 的则直接进 mediaSources 实时抓取。
 * 检索命中的文章会打上对应公司标签，自动汇入传媒监控。
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termRegex(term: string): RegExp {
  const escaped = escapeRegex(term);
  // 纯 ASCII 且长度 ≥3 的别名（如 CMC / Caixin / Linmon）加词边界，避免误命中。
  if (/^[\x00-\x7F]+$/.test(term) && term.length >= 3) {
    return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i');
  }
  return new RegExp(escaped, 'i');
}

// 只用「公司全名 + distinctive 别名」做检索。剔除 2 字短别名（央视/总台/财新/浙报 等），
// 因为它们会命中媒体自家文章里的署名样板（如「央视网消息」「财新网讯」「羊城晚报讯」），
// 造成大量把该媒体自身无关新闻误标到自己名下的假阳性（实测：短别名 88/22/16 条误标，
// 改用全名后归零）。判定为 distinctive 的别名：ASCII 且长度≥3（加词边界），或中文长度≥4。
function isDistinctiveAlias(alias: string): boolean {
  if (/^[\x00-\x7F]+$/.test(alias)) return alias.length >= 3;
  return alias.length >= 4;
}

const COMPANY_TERM_REGEX = nonListedCompanies.map((c) => ({
  name: c.name,
  regexes: [c.name, ...c.aliases.filter(isDistinctiveAlias)].map(termRegex),
}));

export function detectNonListedCompany(text: string): string | undefined {
  for (const c of COMPANY_TERM_REGEX) {
    if (c.regexes.some((rx) => rx.test(text))) return c.name;
  }
  return undefined;
}

/**
 * 在已有 RSS 情报中按公司名检索非上市公司提及，并打上公司标签。
 * 只扫描标题 + 正文，不扫描来源名（source）——因为「文章由某媒体发布」不等于
 * 「文章是关于该媒体的情报」；扫来源名会把该媒体自己发的所有无关新闻误标到自身。
 */
export function searchNonListedInArticles(articles: IntelArticle[]): IntelArticle[] {
  const out: IntelArticle[] = [];
  for (const a of articles) {
    const company = detectNonListedCompany(`${a.title} ${a.description}`);
    if (!company) continue;
    out.push({ ...a, company, companyGroup: a.companyGroup || 'RSS 非上市公司检索' });
  }
  return out;
}

const fetchNonListedRssCached = withTtlCache(async () => {
  const all = await fetchMediaArticles();
  return searchNonListedInArticles(all);
}, 30 * 60 * 1000);

/** 返回经 RSS 检索命中的非上市公司情报（含财新直连 Feed 与新闻流提及）。 */
export async function fetchNonListedRssIntel(): Promise<IntelArticle[]> {
  return fetchNonListedRssCached();
}
