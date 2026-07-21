import { IntelArticle } from './types';
import { makeId } from './feed-utils';
import { makeQueriesForCompany, findNonListedCompany } from './non-listed-companies';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ARK_RESPONSES_BASE_URL = (
  process.env.ARK_RESPONSES_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
).replace(/\/$/, '');
// 用户指定的模型 doubao-seed-evolving 现已在 Ark 开通（实测返回 has output: True）。
const MODEL = process.env.ARK_SEARCH_MODEL || 'doubao-seed-evolving';
const MAX_KEYWORD = Math.max(1, parseInt(process.env.ARK_SEARCH_MAX_KEYWORD || '2', 10));
const COUNT = Math.max(1, Math.min(parseInt(process.env.DOUBAO_SEARCH_RESULT_COUNT || '10', 10), 20));
const WINDOW_DAYS = Math.max(1, parseInt(process.env.DOUBAO_SUPPLEMENT_WINDOW_DAYS || '90', 10));

interface RawRow {
  title: string;
  url: string;
  source?: string;
  published?: string;
  summary?: string;
}

export interface DoubaoCompanyResult {
  company: string;
  total: number;
  verified: number;
  rejected: number;
  errors: string[];
  articles: IntelArticle[];
}

function dateWindow(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function buildPrompt(query: string, start: string, end: string): string {
  return (
    `只使用 web_search 搜索 ${start} 至 ${end} 的以下主题：${query}。` +
    `最多返回 ${COUNT} 条互不重复、可核验的原始信源。` +
    '只输出 JSON 数组，不要分析、不要 markdown。每项字段固定为：' +
    'title,url,source,published,summary。published 尽量使用 ISO-8601；' +
    'url 必须是原始网页，不能是搜索页或虚构链接。'
  );
}

function extractJsonRows(text: string): RawRow[] {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const candidates = [cleaned];
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) candidates.push(match[0]);
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      const arr = Array.isArray(value)
        ? value
        : Array.isArray(value?.items)
          ? value.items
          : Array.isArray(value?.results)
            ? value.results
            : [];
      if (Array.isArray(arr)) {
        return arr
          .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
          .map((r) => ({
            title: String(r.title ?? r.Title ?? '').trim(),
            url: String(r.url ?? r.Url ?? '').trim(),
            source: r.source ? String(r.source ?? r.SiteName ?? '').trim() : '',
            published: r.published ? String(r.published ?? r.PublishTime ?? '').trim() : '',
            summary: r.summary ? String(r.summary ?? r.Summary ?? r.Snippet ?? '').trim() : '',
          }));
      }
    } catch {
      // try next candidate
    }
  }
  return [];
}

async function callDoubao(queries: string[], start: string, end: string): Promise<RawRow[]> {
  const apiKey = process.env.ARK_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error('缺少 ARK_SEARCH_API_KEY（豆包搜索密钥）。请在环境变量中配置后重试。');
  }

  const allRows: RawRow[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const body = {
      model: MODEL,
      stream: false,
      tools: [{ type: 'web_search', max_keyword: MAX_KEYWORD }],
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: buildPrompt(query, start, end) }],
        },
      ],
    };

    const res = await fetch(`${ARK_RESPONSES_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`豆包 API 返回 ${res.status}：${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const textParts: string[] = [];
    const annotations: { url?: string; title?: string }[] = [];

    for (const out of (data?.output as unknown[]) || []) {
      if (!out || typeof out !== 'object' || (out as any).type !== 'message') continue;
      for (const c of (out as any).content || []) {
        if (c?.type === 'output_text') {
          textParts.push(c.text || '');
          for (const a of c.annotations || []) annotations.push(a);
        }
      }
    }

    const rows = extractJsonRows(textParts.join('\n'));
    for (const r of rows) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      allRows.push(r);
    }

    if (allRows.length === 0 && annotations.length) {
      for (const a of annotations) {
        if (a.url && !seen.has(a.url)) {
          seen.add(a.url);
          allRows.push({ title: a.title || a.url, url: a.url, source: a.title || '', published: '', summary: '' });
        }
      }
    }
  }

  return allRows;
}

async function verifyUrl(url: string): Promise<{ ok: boolean; status?: number }> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; MediaIntelBot/1.0)',
    Accept: 'text/html,application/xhtml+xml,application/xml,*/*',
  };
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', headers, signal: AbortSignal.timeout(8000) });
    if (res.status >= 200 && res.status < 400) return { ok: true, status: res.status };
    if (res.status === 405 || res.status === 403) {
      const r2 = await fetch(url, { method: 'GET', redirect: 'follow', headers, signal: AbortSignal.timeout(8000) });
      return { ok: r2.status >= 200 && r2.status < 400, status: r2.status };
    }
    return { ok: false, status: res.status };
  } catch {
    return { ok: false };
  }
}

async function verifyAll(urls: string[], concurrency = 5): Promise<Map<string, { ok: boolean; status?: number }>> {
  const result = new Map<string, { ok: boolean; status?: number }>();
  let idx = 0;
  const worker = async () => {
    while (idx < urls.length) {
      const url = urls[idx++];
      result.set(url, await verifyUrl(url));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  return result;
}

function toArticle(row: RawRow, company: string): IntelArticle {
  const published = row.published || new Date().toISOString();
  return {
    id: `doubao-${makeId(row.url || row.title)}`,
    title: row.title || '未命名资讯',
    description: (row.summary || '').slice(0, 260),
    url: row.url,
    source: row.source || '豆包搜索',
    categories: ['非上市公司', '豆包补充', company],
    publishedAt: published,
    author: company,
    company,
    companyGroup: '豆包联网搜索',
    priority: 'P2',
    dimension: '待分类',
    matrixLabel: '豆包联网搜索',
    credibility: '中高',
  };
}

/**
 * 对单个非上市公司跑豆包联网搜索 + 来源 URL 可达性校验。
 * 返回已校验通过的 IntelArticle[]（不可达的来源会被过滤）。
 */
export async function runDoubaoCompanySearch(company: string): Promise<DoubaoCompanyResult> {
  const { start, end } = dateWindow(WINDOW_DAYS);
  const matched = findNonListedCompany(company);
  const displayName = matched?.name || company;
  const queries = makeQueriesForCompany(company);
  const errors: string[] = [];

  try {
    const rawRows = await callDoubao(queries, start, end);
    if (rawRows.length === 0) {
      return { company: displayName, total: 0, verified: 0, rejected: 0, errors, articles: [] };
    }
    const verifications = await verifyAll(rawRows.map((r) => r.url));
    const articles: IntelArticle[] = [];
    let rejected = 0;
    for (const row of rawRows) {
      const v = verifications.get(row.url);
      if (v?.ok) articles.push(toArticle(row, displayName));
      else rejected += 1;
    }
    return { company: displayName, total: rawRows.length, verified: articles.length, rejected, errors, articles };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { company: displayName, total: 0, verified: 0, rejected: 0, errors, articles: [] };
  }
}

export function isDoubaoConfigured(): boolean {
  return Boolean(process.env.ARK_SEARCH_API_KEY);
}
