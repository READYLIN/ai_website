import Parser from 'rss-parser';
const parser = new Parser({ timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
const MIRROR = 'https://hub.slarker.me';
const FEEDS = ['/thepaper/featured','/caixin/latest','/infzm/1','/zjol/paper/zjrb','/cctv/world','/cctv/china','/ycwb/22','/ycwb/18','/stcn/article/list/company','/stcn/article/list/yw'];
const names = ['新潮传媒','中央广播电视总台','南方报业传媒集团','上海报业集团','成都传媒集团','大众报业集团','长江传媒','浙江日报报业集团','深圳报业集团','河南广电网络','西安报业传媒集团','重庆日报报业集团','四川日报报业集团','湖南日报报业集团','湖北日报传媒集团','安徽日报报业集团','辽宁报刊传媒集团','贵州日报报刊社','广西日报传媒集团','北京日报报业集团','羊城晚报报业集团','深圳广电集团','长江日报报业集团','苏州日报报业集团','南京报业传媒集团','天津海河传媒中心','郑州报业集团','东莞报业传媒集团','青岛报业传媒集团','昆明报业传媒集团','宁波日报报业集团','合肥报业传媒集团','正午阳光','柠萌影业','耀客传媒','华人文化集团','财新传媒'];
let all = [];
for (const r of FEEDS) {
  try {
    const f = await parser.parseURL(MIRROR + r);
    for (const it of (f.items || [])) all.push((it.title || '') + ' ' + (it.contentSnippet || it.content || ''));
  } catch (e) {}
}
console.log('articles:', all.length);
const hits = {};
const samples = {};
for (const t of all) {
  for (const n of names) {
    if (t.includes(n)) { hits[n] = (hits[n] || 0) + 1; if (!samples[n]) samples[n] = t.slice(0, 50); }
  }
}
console.log('FULL-NAME hits:', Object.keys(hits).length);
for (const [n, c] of Object.entries(hits).sort((a, b) => b[1] - a[1])) console.log('  ' + n + ': ' + c + '  e.g. "' + samples[n] + '"');
