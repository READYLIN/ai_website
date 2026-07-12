'use client';

import { useState } from 'react';
import { IntelArticle } from '@/lib/types';
import IntelCard from './IntelCard';
import Pagination from './Pagination';

const PAGE_SIZE = 12;

export default function MediaIntelList({
  articles,
  linkPrefix = '/articles/',
}: {
  articles: IntelArticle[];
  linkPrefix?: string;
}) {
  const [page, setPage] = useState(1);

  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark" aria-hidden="true">⌕</div>
        <h2 className="font-display text-xl font-semibold">暂无匹配内容</h2>
        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">该分类下暂无数据。</p>
      </div>
    );
  }

  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const visible = articles.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((article, index) => (
          <IntelCard
            key={article.id}
            article={article}
            linkPrefix={linkPrefix}
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}