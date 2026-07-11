'use client';

import { useState } from 'react';
import { Article } from '@/lib/types';
import ArticleCard from './ArticleCard';
import FeaturedArticle from './FeaturedArticle';
import Pagination from './Pagination';

const PAGE_SIZE = 12;

export default function ArticleList({
  articles,
  linkPrefix = '/articles/',
  showFeatured = false,
}: {
  articles: Article[];
  linkPrefix?: string;
  showFeatured?: boolean;
}) {
  const [page, setPage] = useState(1);

  if (articles.length === 0) {
    return (
      <div className="empty-state">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark" aria-hidden="true">⌕</div>
        <h2 className="font-display text-xl font-semibold">暂时没有匹配内容</h2>
        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">换一个分类或关键词再试。</p>
      </div>
    );
  }

  const featured = showFeatured ? articles[0] : null;
  const rest = showFeatured ? articles.slice(1) : articles;

  const totalPages = Math.ceil(rest.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const visible = rest.slice(start, start + PAGE_SIZE);

  return (
    <div>
      {featured && page === 1 && <FeaturedArticle article={featured} linkPrefix={linkPrefix} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((article, index) => (
          <ArticleCard
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
