'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Article } from '@/lib/types';
import { useSearch } from '@/hooks/useSearch';
import ArticleList from '@/components/ArticleList';
import SearchBar from '@/components/SearchBar';
import { Suspense } from 'react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { query, results, search } = useSearch(articles);

  useEffect(() => {
    fetch('/api/articles')
      .then((res) => res.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialQuery && !loading) {
      search(initialQuery);
    }
  }, [initialQuery, loading, articles, search]);

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 max-w-2xl">
        <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Search archive</span></div>
        <h1 className="font-display text-display-md font-bold tracking-tight mb-5">搜索全部内容</h1>
        <SearchBar initialValue={initialQuery} />
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="正在加载搜索索引">
            {[0, 1, 2].map((item) => <div key={item} className="card min-h-56"><div className="skeleton-line mb-4 h-3 w-1/3" /><div className="skeleton-line mb-2 h-5 w-full" /><div className="skeleton-line h-5 w-4/5" /></div>)}
          </div>
        ) : query ? (
          <>
            <p className="text-light-muted dark:text-dark-muted mb-6">
              关于“{query}”找到 <span className="font-mono text-light-text dark:text-dark-text">{results.length}</span> 条结果
            </p>
            <ArticleList articles={results} />
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
