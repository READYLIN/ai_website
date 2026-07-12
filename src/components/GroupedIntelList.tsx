'use client';

import { useState } from 'react';
import { IntelArticle } from '@/lib/types';
import IntelCard from './IntelCard';
import Pagination from './Pagination';

const GROUPS_PER_PAGE = 6;

function groupByCompany(articles: IntelArticle[]): { company: string; items: IntelArticle[] }[] {
  const map = new Map<string, IntelArticle[]>();
  for (const a of articles) {
    const key = a.company || '其他';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return Array.from(map.entries())
    .map(([company, items]) => ({
      company,
      items: items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.company.localeCompare(b.company, 'zh-CN'));
}

export default function GroupedIntelList({
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
        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">该筛选条件下暂无数据。</p>
      </div>
    );
  }

  const groups = groupByCompany(articles);
  const totalPages = Math.ceil(groups.length / GROUPS_PER_PAGE);
  const start = (page - 1) * GROUPS_PER_PAGE;
  const visible = groups.slice(start, start + GROUPS_PER_PAGE);

  return (
    <div>
      {visible.map((group, gi) => (
        <section key={group.company} className="mb-10">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-light-border/50 dark:border-dark-border/50">
            <span className="w-1.5 h-1.5 rounded-full bg-accent dark:bg-accent-dark shrink-0" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-light-text dark:text-dark-text">
              {group.company}
            </h2>
            <span className="text-xs text-light-muted dark:text-dark-muted font-mono tabular-nums">
              {group.items.length} 条
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {group.items.map((article, idx) => (
              <IntelCard
                key={article.id}
                article={article}
                linkPrefix={linkPrefix}
                style={{ animationDelay: `${(gi * GROUPS_PER_PAGE + idx) * 60}ms` }}
              />
            ))}
          </div>
        </section>
      ))}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />
    </div>
  );
}