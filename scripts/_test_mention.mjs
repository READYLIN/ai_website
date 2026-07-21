// End-to-end: fetch fresh news pool via working mirror, run the SAME name/alias
// mention-detection (title+description only) used by non-listed-search.ts, and
// report which of the 37 companies got real hits.
import Parser from 'rss-parser';
const parser = new Parser({ timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaIntelBot/1.0)' } });

const MIRROR = 'https://hub.slarker.me';
// fresh pool (rewrite rsshub.app -> working mirror), plus a couple existing fresh ones
const FEEDS = [
  '/thepaper/featured', '/caixin/latest', '/infzm/1', '/zjol/paper/zjrb',
  '/cctv/world', '/cctv/china', '/ycwb/22', '/ycwb/18',
  '/stcn/article/list/company', '/stcn/article/list/yw',
];

// 37 companies + aliases (mirror of non-listed-companies.ts)
const companies = [
  ['新潮传媒', ['新潮传媒']], ['中央广播电视总台', ['总台','央视','CMG']], ['南方报业传媒集团', ['南方报业']],
  ['上海报业集团', ['上海报业']], ['成都传媒集团', ['成都传媒']], ['大众报业集团', ['大众报业']],
  ['长江传媒', ['长江传媒']], ['浙江日报报业集团', ['浙报','浙江日报']], ['深圳报业集团', ['深圳报业']],
  ['河南广电网络', ['河南广电']], ['西安报业传媒集团', ['西安报业']], ['重庆日报报业集团', ['重庆日报']],
  ['四川日报报业集团', ['四川日报']], ['湖南日报报业集团', ['湖南日报']], ['湖北日报传媒集团', ['湖北日报']],
  ['安徽日报报业集团', ['安徽日报']], ['辽宁报刊传媒集团', ['辽宁报刊']], ['贵州日报报刊社', ['贵州日报']],
  ['广西日报传媒集团', ['广西日报']], ['北京日报报业集团', ['北京日报']], ['羊城晚报报业集团', ['羊城晚报']],
  ['深圳广电集团', ['深圳广电']], ['长江日报报业集团', ['长江日报']], ['苏州日报报业集团', ['苏州报业']],
  ['南京报业传媒集团', ['南京报业']], ['天津海河传媒中心', ['海河传媒']], ['郑州报业集团', ['郑州报业']],
  ['东莞报业传媒集团', ['东莞报业']], ['青岛报业传媒集团', ['青岛报业']], ['昆明报业传媒集团', ['昆明报业']],
  ['宁波日报报业集团', ['宁波日报']], ['合肥报业传媒集团', ['合肥报业']], ['正午阳光', ['东阳正午阳光影视有限公司']],
  ['柠萌影业', ['柠萌影视']], ['耀客传媒', ['上海耀客文化传媒有限公司']],
  ['华人文化集团', ['CMC','华人文化集团(CMC)','华人文化集团（CMC）']], ['财新传媒', ['财新']],
];
function escapeRegex(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function termRegex(t){const e=escapeRegex(t); if(/^[\x00-\x7F]+$/.test(t)&&t.length>=3) return new RegExp(`(?<![A-Za-z0-9])${e}(?![A-Za-z0-9])`,'i'); return new RegExp(e,'i');}
const REG = companies.map(([name,al])=>({name, rx:[name,...al].map(termRegex)}));
function detect(text){ for(const c of REG){ if(c.rx.some(r=>r.test(text))) return c.name; } return undefined; }

let all = [];
for (const route of FEEDS) {
  try {
    const feed = await parser.parseURL(MIRROR + route);
    for (const it of (feed.items||[])) all.push({ title: it.title||'', desc: it.contentSnippet||it.content||'', source: route });
  } catch (e) { console.log(`  feed fail ${route}: ${String(e.message||e).slice(0,40)}`); }
}
console.log('total articles fetched:', all.length);
const hits = {};
for (const a of all) { const c = detect(`${a.title} ${a.desc}`); if (c) (hits[c] ||= []).push(a); }
console.log('companies hit:', Object.keys(hits).length);
for (const [c, arr] of Object.entries(hits).sort((x,y)=>y[1].length-x[1].length)) {
  console.log(`  ${c}: ${arr.length}  e.g. "${arr[0].title.slice(0,44)}"`);
}
console.log('DONE');
