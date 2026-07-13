'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

interface SearchResult {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  source: string;
  categories: string;
  type: 'article' | 'media' | 'pe';
  url: string;
  publishedAt: string;
  company?: string;
}

const TYPE_LABELS: Record<string, string> = {
  article: 'AI资讯',
  media: '传媒',
  pe: '私募',
};

const TYPE_ROUTES: Record<string, string> = {
  article: '/articles/',
  media: '/media/',
  pe: '/private-equity/',
};

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!initialQuery) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(initialQuery)}&limit=50`)
      .then((r) => r.json())
      .then((d) => { setResults(d.results || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=50`)
      .then((r) => r.json())
      .then((d) => { setResults(d.results || []); setTotal(d.total || 0); setLoading(false); })
      .catch(() => setLoading(false));
  };

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 max-w-2xl">
        <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Search across all content</span></div>
        <h1 className="font-display text-display-md font-bold tracking-tight mb-5">搜索全部内容</h1>
        <form onSubmit={handleSubmit} role="search">
          <div className="flex gap-2">
            <input
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索公司、模型、论文、关键词…"
              className="input-search flex-1"
              autoFocus
            />
            <button type="submit" className="btn-primary whitespace-nowrap">搜索</button>
          </div>
        </form>
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="card min-h-44">
                <div className="skeleton-line mb-4 h-3 w-1/4" />
                <div className="skeleton-line mb-2 h-5 w-full" />
                <div className="skeleton-line h-5 w-4/5" />
              </div>
            ))}
          </div>
        ) : initialQuery ? (
          <>
            <p className="text-light-muted dark:text-dark-muted mb-6">
              搜索「{initialQuery}」找到 <span className="font-mono text-light-text dark:text-dark-text font-semibold">{total}</span> 条结果
            </p>
            {results.length === 0 ? (
              <div className="empty-state">
                <h2 className="font-display text-xl font-semibold">未找到匹配结果</h2>
                <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">试试其他关键词。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((r) => (
                  <article key={r.id} className="rounded-card-lg border border-light-border/60 bg-light-surface dark:border-dark-border/60 dark:bg-dark-surface p-5 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.type === 'article' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        r.type === 'media' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                      }`}>{TYPE_LABELS[r.type] || r.type}</span>
                      {r.company && <span className="text-[11px] text-light-muted dark:text-dark-muted">{r.company}</span>}
                    </div>
                    <h3 className="font-display text-sm font-semibold leading-snug mb-2 line-clamp-2">
                      <a href={`${TYPE_ROUTES[r.type] || '/articles/'}${r.id}`} className="text-light-text dark:text-dark-text hover:text-accent">
                        {(r.titleZh || r.title).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()}
                      </a>
                    </h3>
                    {r.description && (
                      <p className="text-xs text-light-muted dark:text-dark-muted leading-relaxed line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-light-border/40 dark:border-dark-border/40">
                      <span className="text-[10px] text-light-muted dark:text-dark-muted truncate">{r.source}</span>
                      <time className="text-[10px] text-light-muted/70 dark:text-dark-muted/70 tabular-nums">
                        {r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : ''}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h2 className="font-display text-xl font-semibold">从一个关键词开始</h2>
            <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">可搜索公司、模型、人物、技术方向或内容来源。</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-site py-12">
          <div className="skeleton-line h-10 max-w-2xl" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}