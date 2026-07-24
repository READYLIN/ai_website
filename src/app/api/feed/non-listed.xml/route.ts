import { NextRequest } from 'next/server';
import { getNonListedDoubao } from '@/lib/storage';
import { IntelArticle } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeXml(input: string): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toUTCString();
  return d.toUTCString();
}

function buildRss(items: IntelArticle[], origin: string): string {
  const channelTitle = '非上市公司情报（AI 联网搜索）';
  const channelLink = `${origin}/api/feed/non-listed.xml`;
  const channelDesc =
    '由 ai_web 通过 AI 联网搜索抓取、并经来源链接校验的非上市公司公开情报，覆盖央媒、报业集团、广电系、出版与内容传媒等非上市主体。';
  const lastBuild = new Date().toUTCString();

  const entries = items
    .map((it) => {
      const title = escapeXml(it.title || '未命名资讯');
      const link = escapeXml(it.url || '');
      const desc = escapeXml(
        [it.description, it.source ? `来源：${it.source}` : '', it.company ? `主体：${it.company}` : '']
          .filter(Boolean)
          .join(' ｜ '),
      );
      const pubDate = toRfc822(it.publishedAt);
      const guid = escapeXml(it.id || it.url || title);
      const cats = (it.categories || [])
        .filter(Boolean)
        .map((c) => `      <category>${escapeXml(c === '豆包联网搜索' ? 'AI 联网搜索' : c)}</category>`)
        .join('\n');
      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
${cats}
    </item>`;
    })
    .join('\n');

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

export async function GET(req: NextRequest) {
  let items: IntelArticle[] = [];
  try {
    const all = await getNonListedDoubao();
    items = all.filter((it) => it && it.url);
  } catch (err) {
    console.error('[feed/non-listed] read failed:', err);
  }

  items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());

  const xml = buildRss(items, req.nextUrl.origin);
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
