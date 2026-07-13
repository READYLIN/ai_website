import { NextResponse } from 'next/server';
import { fetchAllArticles } from '@/lib/fetcher';
import { fetchAllPapers } from '@/lib/paper-fetcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [articles, papers] = await Promise.all([
    fetchAllArticles().catch(() => []),
    fetchAllPapers().catch(() => []),
  ]);

  const siteUrl = 'https://aiweb-roan.vercel.app';

  const items = [
    ...articles.slice(0, 30).map((a) => ({
      title: a.titleZh || a.title,
      link: a.url || `${siteUrl}/articles/${a.id}`,
      description: a.descriptionZh || a.description || '',
      pubDate: new Date(a.publishedAt).toUTCString(),
      guid: `${siteUrl}/articles/${a.id}`,
    })),
    ...papers.slice(0, 10).map((p) => ({
      title: p.title,
      link: p.arxivUrl || p.pdfUrl || `${siteUrl}/papers/${p.id}`,
      description: p.abstract || '',
      pubDate: new Date(p.publishedAt).toUTCString(),
      guid: `${siteUrl}/papers/${p.id}`,
    })),
  ];

  items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>新闻中心 · AI 资讯与传媒私募情报</title>
    <link>${siteUrl}</link>
    <description>AI 新闻、前沿论文、传媒经营动态与私募股权情报聚合</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items.map((i) => `
    <item>
      <title><![CDATA[${i.title}]]></title>
      <link>${escapeXml(i.link)}</link>
      <description><![CDATA[${i.description.slice(0, 500)}]]></description>
      <pubDate>${i.pubDate}</pubDate>
      <guid>${escapeXml(i.guid)}</guid>
    </item>`).join('')}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}