// Retry only the 4 companies that failed on transient timeouts (not billing).
// Adds their entries to the existing Upstash hash; does NOT overwrite the meta summary.
import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';

const ARK_KEY = process.env.ARK_SEARCH_API_KEY;
const BASE = (process.env.ARK_RESPONSES_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
const MODEL = process.env.ARK_SEARCH_MODEL || 'doubao-seed-evolving';
const WINDOW_DAYS = parseInt(process.env.DOUBAO_SUPPLEMENT_WINDOW_DAYS || '90', 10);
const COUNT = Math.max(1, Math.min(parseInt(process.env.DOUBAO_SEARCH_RESULT_COUNT || '8', 10), 20));
const MAX_KEYWORD = Math.max(1, parseInt(process.env.ARK_SEARCH_MAX_KEYWORD || '2', 10));

if (!ARK_KEY) { console.error('Missing ARK_SEARCH_API_KEY'); process.exit(1); }

const companies = ['新潮传媒','深圳报业集团','辽宁报刊传媒集团','青岛报业传媒集团'];

function dateWindow(days) {
  const end = new Date(); const start = new Date(); start.setDate(start.getDate() - days);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
function buildPrompt(query, start, end) {
  return (
    `只使用 web_search 搜索 ${start} 至 ${end} 的以下主题：${query}。` +
    `最多返回 ${COUNT} 条互不重复、可核验的原始信源。` +
    '只输出 JSON 数组，不要分析、不要 markdown。每项字段固定为：' +
    'title,url,source,published,summary。published 尽量使用 ISO-8601；' +
    'url 必须是原始网页，不能是搜索页或虚构链接。'
  );
}
function extractJsonRows(text) {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  const candidates = [cleaned];
  const m = cleaned.match(/\[[\s\S]*\]/); if (m) candidates.push(m[0]);
  for (const c of candidates) {
    try {
      const v = JSON.parse(c);
      const arr = Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.results) ? v.results : [];
      if (Array.isArray(arr)) {
        return arr.filter(r => r && typeof r === 'object').map(r => ({
          title: String(r.title ?? r.Title ?? '').trim(),
          url: String(r.url ?? r.Url ?? '').trim(),
          source: r.source ? String(r.source ?? r.SiteName ?? '').trim() : '',
          published: r.published ? String(r.published ?? r.PublishTime ?? '').trim() : '',
          summary: r.summary ? String(r.summary ?? r.Summary ?? r.Snippet ?? '').trim() : '',
        }));
      }
    } catch {}
  }
  return [];
}
function makeQueries(name) {
  return [
    `${name} 业绩 营收 净利润 融资 股权交易 重组 收购 并购`,
    `${name} 中标 订单 客户 经营 业务 战略合作 项目落地`,
    `${name} AI AIGC 数字化 大模型 产品 技术 业务转型`,
    `${name} 对外投资 并购 基金 生态合作 新业务；排除董监高 股东会 董事会 换届`,
  ];
}
async function callDoubao(query, start, end) {
  const body = {
    model: MODEL, stream: false,
    tools: [{ type: 'web_search', max_keyword: MAX_KEYWORD }],
    input: [{ role: 'user', content: [{ type: 'input_text', text: buildPrompt(query, start, end) }] }],
  };
  const res = await fetch(`${BASE}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ARK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) { const d = await res.text().catch(() => ''); throw new Error(`Ark ${res.status}: ${d.slice(0, 200)}`); }
  const data = await res.json();
  const textParts = [];
  for (const out of (data?.output || [])) {
    if (!out || typeof out !== 'object' || out.type !== 'message') continue;
    for (const c of (out.content || [])) if (c?.type === 'output_text') textParts.push(c.text || '');
  }
  return extractJsonRows(textParts.join('\n'));
}
async function verifyUrl(url) {
  const h = { 'User-Agent': 'Mozilla/5.0 (compatible; MediaIntelBot/1.0)', Accept: 'text/html,*/*' };
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow', headers: h, signal: AbortSignal.timeout(8000) });
    if (r.status >= 200 && r.status < 400) return true;
    if (r.status === 405 || r.status === 403) {
      const r2 = await fetch(url, { method: 'GET', redirect: 'follow', headers: h, signal: AbortSignal.timeout(8000) });
      return r2.status >= 200 && r2.status < 400;
    }
    return false;
  } catch { return false; }
}
function toArticle(row, company) {
  const published = row.published || new Date().toISOString();
  return {
    id: `doubao-${createHash('sha256').update(row.url || row.title).digest('hex').slice(0, 16)}`,
    title: row.title || '未命名资讯',
    description: (row.summary || '').slice(0, 260),
    url: row.url,
    source: row.source || '豆包搜索',
    categories: ['非上市公司', '豆包补充', company],
    publishedAt: published,
    author: company,
    company, companyGroup: '豆包联网搜索',
    priority: 'P2', dimension: '待分类', matrixLabel: '豆包联网搜索',
    credibility: '中高',
  };
}
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
let totalAdded = 0;
async function runCompany(name) {
  const { start, end } = dateWindow(WINDOW_DAYS);
  const queries = makeQueries(name);
  const rows = []; const seen = new Set(); let err = '';
  try {
    for (const q of queries) {
      const r = await callDoubao(q, start, end);
      for (const x of r) { if (x.url && !seen.has(x.url)) { seen.add(x.url); rows.push(x); } }
    }
  } catch (e) { err = String(e.message || e); }
  const verifications = await Promise.all(rows.map(r => verifyUrl(r.url)));
  const articles = [];
  rows.forEach((r, i) => { if (verifications[i]) articles.push(toArticle(r, name)); });
  if (articles.length) {
    try { await redis.hset('intelligence:non-listed-doubao', Object.fromEntries(articles.map(a => [a.id, JSON.stringify(a)]))); }
    catch (e) { err += ` | write fail: ${String(e)}`; }
  }
  totalAdded += articles.length;
  console.log(`[${name}] found=${rows.length} verified=${articles.length}${err ? ' ERR=' + err : ''}`);
  return { company: name, found: rows.length, verified: articles.length, errors: err ? [err] : [] };
}
const res = [];
for (const c of companies) { try { res.push(await runCompany(c)); } catch (e) { res.push({ company: c, found: 0, verified: 0, errors: [String(e)] }); } }
console.log('\n=== RETRY FINAL ===');
console.log(JSON.stringify({ totalVerified: totalAdded, companies: res }, null, 2));
process.exit(0);
