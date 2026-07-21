import { Redis } from '@upstash/redis';

const KEY = 'intelligence:non-listed-doubao';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

function escapeXml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function toRfc822(d) { const x = new Date(d); return isNaN(x.getTime()) ? new Date().toUTCString() : x.toUTCString(); }
function buildRss(items, origin) {
  const channelTitle = '非上市公司情报（豆包联网搜索）';
  const channelLink = `${origin}/api/feed/non-listed.xml`;
  const channelDesc = '由 ai_web 通过豆包联网搜索抓取、并经来源链接校验的非上市公司公开情报，覆盖央媒、报业集团、广电系、出版与内容传媒等非上市主体。';
  const lastBuild = new Date().toUTCString();
  const entries = items.map((it) => {
    const cats = (it.categories || []).filter(Boolean).map((c) => `      <category>${escapeXml(c)}</category>`).join('\n');
    return `    <item>
      <title>${escapeXml(it.title || '未命名资讯')}</title>
      <link>${escapeXml(it.url || '')}</link>
      <guid isPermaLink="false">${escapeXml(it.id || it.url || it.title)}</guid>
      <pubDate>${toRfc822(it.publishedAt)}</pubDate>
      <description>${escapeXml([it.description, it.source ? '来源：' + it.source : '', it.company ? '主体：' + it.company : ''].filter(Boolean).join(' ｜ '))}</description>
${cats}
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channelTitle)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channelDesc)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(channelLink)}" rel="self" type="application/rss+xml" />
    <generator>ai_web</generator>
${entries}
  </channel>
</rss>`;
}

const hash = await redis.hgetall(KEY);
const items = Object.values(hash || {}).map((v) => (typeof v === 'string' ? JSON.parse(v) : v)).filter((it) => it && it.url);
items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
const xml = buildRss(items, 'https://aiweb-roan.vercel.app');
console.log('total items:', items.length);
console.log('xml length:', xml.length);
console.log('starts with <?xml:', xml.startsWith('<?xml'));
console.log('first item title:', items[0]?.title);
console.log('first item pubDate:', toRfc822(items[0]?.publishedAt));
import { writeFileSync } from 'fs';
writeFileSync('/tmp/feed_test.xml', xml);
writeFileSync('/Users/z1/Documents/New project/ai_web/nonlisted_feed.xml', xml);
console.log('written /tmp/feed_test.xml and nonlisted_feed.xml');
