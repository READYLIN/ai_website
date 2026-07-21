import Parser from 'rss-parser';
const parser = new Parser({ timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MediaIntelBot/1.0)' } });

// route -> company mapping (company-owned flagship outlets)
const ROUTES = {
  '/thepaper/featured': '上海报业集团(澎湃新闻)',
  '/caixin/latest': '财新传媒',
  '/infzm/hot': '南方报业传媒集团(南方周末)',
  '/infzm/1': '南方报业传媒集团(南方周末-频道)',
  '/zjol/paper/zjrb': '浙江日报报业集团(浙江日报)',
  '/cctv/world': '中央广播电视总台(参照-已用)',
  '/ycwb/22': '羊城晚报报业集团(参照-已用)',
};
const MIRRORS = ['https://hub.slarker.me', 'https://rsshub.ktachibana.party'];

async function tryFetch(route) {
  for (const m of MIRRORS) {
    try {
      const feed = await parser.parseURL(m + route);
      const items = feed.items || [];
      const dates = items.map((i) => new Date(i.isoDate || i.pubDate || 0).getTime()).filter((t) => !isNaN(t) && t > 0).sort((a, b) => b - a);
      const newest = dates[0] ? new Date(dates[0]).toISOString().slice(0, 10) : null;
      return { mirror: m, count: items.length, newest, sample: items[0]?.title?.slice(0, 40) };
    } catch (e) {
      // try next mirror
      continue;
    }
  }
  return null;
}

const now = Date.now();
for (const [route, company] of Object.entries(ROUTES)) {
  const r = await tryFetch(route);
  if (!r) { console.log(`  FAIL  ${route}  (${company})`); continue; }
  const ageDays = r.newest ? Math.round((now - new Date(r.newest).getTime()) / 86400000) : null;
  const fresh = ageDays != null && ageDays <= 30 ? '🟢FRESH' : ageDays != null && ageDays <= 120 ? '🟡OLDish' : '🔴STALE';
  console.log(`${fresh} ${route}  items=${r.count} newest=${r.newest} (${ageDays}d ago)  e.g. "${r.sample}"  [${company}]`);
}
console.log('DONE');
