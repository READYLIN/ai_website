import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
const ARK_KEY = process.env.ARK_SEARCH_API_KEY;
const BASE = 'https://ark.cn-beijing.volces.com/api/v3';
const MODEL = 'doubao-seed-evolving';
const name = '财新传媒';
const queries = [
  `${name} 业绩 营收 净利润 融资 股权交易 重组 收购 并购`,
  `${name} AI AIGC 数字化 大模型 产品 技术 业务转型`,
];
function buildPrompt(q,start,end){return `只使用 web_search 搜索 ${start} 至 ${end} 的以下主题：${q}。最多返回 8 条互不重复、可核验的原始信源。只输出 JSON 数组，不要分析、不要 markdown。每项字段固定为：title,url,source,published,summary。`;}
function extractJsonRows(text){const c=text.replace(/^```(?:json)?\s*|\s*```$/g,'').trim();const cs=[c];const m=c.match(/\[[\s\S]*\]/);if(m)cs.push(m[0]);for(const x of cs){try{const v=JSON.parse(x);const a=Array.isArray(v)?v:[];if(Array.isArray(a))return a.filter(r=>r&&typeof r==='object').map(r=>({title:String(r.title??'').trim(),url:String(r.url??'').trim(),source:String(r.source??'').trim(),published:String(r.published??'').trim(),summary:String(r.summary??'').trim()}));}catch{}}return[];}
async function call(q){const body={model:MODEL,stream:false,tools:[{type:'web_search',max_keyword:2}],input:[{role:'user',content:[{type:'input_text',text:buildPrompt(q,'2026-04-20','2026-07-20')}]}]};const res=await fetch(`${BASE}/responses`,{method:'POST',headers:{Authorization:`Bearer ${ARK_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});if(!res.ok){const d=await res.text().catch(()=>'');throw new Error(`Ark ${res.status}: ${d.slice(0,200)}`);}const data=await res.json();const tp=[];for(const o of (data?.output||[])){if(o&&o.type==='message')for(const c of (o.content||[]))if(c?.type==='output_text')tp.push(c.text||'');}return extractJsonRows(tp.join('\n'));}
async function verify(u){try{const r=await fetch(u,{method:'HEAD',redirect:'follow',headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(8000)});if(r.status>=200&&r.status<400)return true;if(r.status===405||r.status===403){const r2=await fetch(u,{method:'GET',redirect:'follow',signal:AbortSignal.timeout(8000)});return r2.status>=200&&r2.status<400;}return false;}catch{return false;}}
const rows=[];const seen=new Set();
for(const q of queries){const r=await call(q);for(const x of r)if(x.url&&!seen.has(x.url)){seen.add(x.url);rows.push(x);}}
console.log('raw rows:',rows.length);
rows.slice(0,3).forEach(r=>console.log(' -',r.title,'|',r.url));
const v=await Promise.all(rows.map(r=>verify(r.url)));
const verified=rows.filter((_,i)=>v[i]);
console.log('verified:',verified.length);
const redis=new Redis({url:process.env.UPSTASH_REDIS_REST_URL,token:process.env.UPSTASH_REDIS_REST_TOKEN});
if(verified.length){const arts=verified.map(r=>({id:`doubao-${createHash('sha256').update(r.url).digest('hex').slice(0,16)}`,title:r.title,url:r.url,source:r.source||'豆包',company:name,categories:['非上市公司','豆包补充',name],publishedAt:r.published||new Date().toISOString()}));
await redis.hset('intelligence:non-listed-doubao',Object.fromEntries(arts.map(a=>[a.id,JSON.stringify(a)])));console.log('written to upstash:',arts.length);}
else console.log('nothing verified, skip write');
