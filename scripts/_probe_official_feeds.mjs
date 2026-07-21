// Probe candidate OFFICIAL RSS feeds for the non-listed companies using the
// same rss-parser the app uses. For each URL: reachability, parseable feed,
// item count, newest item date (freshness).
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; MediaIntelBot/1.0)',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

const CANDIDATES = {
  '财新传媒': [
    'https://www.caixin.com/rss/',
    'https://www.caixin.com/rss/all.xml',
    'https://database.caixin.com/rss/',
    'https://opinion.caixin.com/rss/',
  ],
  '上海报业集团-澎湃': [
    'https://www.thepaper.cn/rss_all.jsp',
    'https://www.jfdaily.com/rss/',
    'https://www.whb.cn/rss/',
  ],
  '南方报业传媒集团': [
    'https://www.southcn.com/rss/',
    'https://www.nfnews.com/rss/',
    'https://www.infzm.com/rss',
    'https://www.nfzm.com/rss',
  ],
  '北京日报报业集团': [
    'https://www.bjd.com.cn/rss/',
    'https://bjrb.bjd.com.cn/rss/',
  ],
  '浙江日报报业集团': [
    'https://www.zjol.com.cn/rss/',
    'https://zjrb.zjol.com.cn/rss/',
  ],
  '成都传媒集团': [
    'https://www.cdrb.com.cn/rss/',
    'https://www.cdsb.com/rss/',
    'https://www.redstar.com.cn/rss/',
  ],
  '大众报业集团': [
    'https://www.dzwww.com/rss/',
  ],
  '湖南日报报业集团': [
    'https://www.voc.com.cn/rss/',
    'https://hnrb.voc.com.cn/rss/',
  ],
  '湖北日报传媒集团': [
    'https://www.hubeidaily.net/rss/',
  ],
  '羊城晚报报业集团': [
    'https://www.ycwb.com/rss/',
  ],
  '重庆日报报业集团': [
    'https://www.cqrb.cn/rss/',
    'https://www.cqcb.com/rss/',
  ],
  '四川日报报业集团': [
    'https://www.scdaily.cn/rss/',
  ],
  '深圳报业集团': [
    'https://www.sznews.com/rss/',
  ],
  '天津海河传媒中心': [
    'https://www.tianjinwe.com/rss/',
    'https://www.enorth.com.cn/rss/',
  ],
  '苏州日报报业集团': [
    'https://www.subaonet.com/rss/',
  ],
  '南京报业传媒集团': [
    'https://www.njdaily.cn/rss/',
  ],
  '青岛报业传媒集团': [
    'https://www.dailyqd.com/rss/',
    'https://www.qtv.com.cn/rss/',
  ],
  '郑州报业集团': [
    'https://www.zynews.cn/rss/',
  ],
  // reference known-good
  '参照-人民网': [
    'http://www.people.com.cn/rss/media.xml',
    'http://www.people.com.cn/rss/politics.xml',
  ],
};

async function probe(url) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items || [];
    const dates = items
      .map((it) => it.isoDate || it.pubDate || '')
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => b - a);
    const newest = dates[0] ? new Date(dates[0]).toISOString().slice(0, 10) : null;
    return { ok: items.length > 0, count: items.length, newest };
  } catch (e) {
    return { ok: false, count: 0, newest: null, err: String(e.message || e).slice(0, 50) };
  }
}

for (const [company, urls] of Object.entries(CANDIDATES)) {
  console.log(`\n### ${company}`);
  for (const u of urls) {
    const r = await probe(u);
    console.log(`${r.ok ? '✅' : '  '} items=${r.count} newest=${r.newest ?? '-'} ${r.err ? '(' + r.err + ')' : ''} ${u}`);
  }
}
console.log('\nDONE');
