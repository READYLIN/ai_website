import { fetchPEIntel } from '@/lib/pe-intel';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serialize } from '@/lib/serialize';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const all = serialize(fetchPEIntel());
  const article = all.find((a: any) => a.id === params.slug);
  if (!article) return { title: '未找到' };
  return {
    title: `${article.title} — 私募股权`,
    description: (article.description || '').slice(0, 160),
    openGraph: { title: article.title, description: (article.description || '').slice(0, 160), type: 'article' },
  };
}

export default async function PEDetailPage({ params }: { params: { slug: string } }) {
  const all = serialize(fetchPEIntel());
  const article = all.find((a: any) => a.id === params.slug);
  if (!article) notFound();

  return (
    <div className="container-site py-8 sm:py-12 max-w-3xl">
      <Link href="/private-equity" className="inline-flex items-center gap-1 text-sm text-light-muted dark:text-dark-muted hover:text-accent dark:hover:text-accent-dark transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        返回私募股权
      </Link>
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {article.priority && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{article.priority}</span>}
            {article.company && <span className="text-sm font-medium text-accent dark:text-accent-dark">{article.company}</span>}
            {article.companyGroup && <span className="text-xs text-light-muted dark:text-dark-muted">{article.companyGroup}</span>}
            {article.dimension && <span className="text-xs px-2 py-0.5 rounded bg-light-border/50 dark:bg-dark-border/50 text-light-muted dark:text-dark-muted">{article.dimension}</span>}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight mb-3">{article.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-light-muted dark:text-dark-muted">
            {article.source && <span>{article.source}</span>}
            <time>{new Date(article.publishedAt).toLocaleString('zh-CN')}</time>
            {article.credibility && <span className="text-xs">可信度: {article.credibility}</span>}
          </div>
        </header>
        {article.description && (
          <section className="prose dark:prose-invert max-w-none mb-8">
            <p className="text-base leading-relaxed text-light-text dark:text-dark-text whitespace-pre-wrap">{article.description}</p>
          </section>
        )}
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors">
          阅读原文
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </article>
    </div>
  );
}