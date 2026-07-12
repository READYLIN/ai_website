'use client';

import { IntelArticle } from '@/lib/types';
import Link from 'next/link';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  P1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  P2: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '⭐⭐⭐': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  '⭐⭐': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  '⭐': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function IntelCard({
  article,
  style,
  linkPrefix = '/articles/',
}: {
  article: IntelArticle;
  style?: React.CSSProperties;
  linkPrefix?: string;
}) {
  const priorityBadge = article.priority
    ? PRIORITY_COLORS[article.priority] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    : '';

  const detailUrl = `${linkPrefix}${article.id}`;

  return (
    <article
      className="group relative flex flex-col rounded-card-lg border border-light-border/60 bg-light-surface dark:border-dark-border/60 dark:bg-dark-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover animate-fade-in"
      style={style}
    >
      {/* Priority badge */}
      {article.priority && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${priorityBadge}`}>
            {article.priority}
          </span>
          {article.dimension && (
            <span className="text-[11px] text-light-muted dark:text-dark-muted">
              {article.dimension}
            </span>
          )}
        </div>
      )}

      {/* Company */}
      {article.company && (
        <p className="text-xs font-medium text-accent dark:text-accent-dark mb-2 tracking-wide uppercase">
          {article.company}
        </p>
      )}

      {/* Title - links to internal detail page */}
      <h3 className="font-display text-base font-semibold leading-snug mb-2 line-clamp-2">
        <Link
          href={detailUrl}
          className="text-light-text dark:text-dark-text hover:text-accent dark:hover:text-accent-dark transition-colors"
        >
          {article.title}
        </Link>
      </h3>

      {/* Description */}
      {article.description && (
        <p className="text-sm text-light-muted dark:text-dark-muted leading-relaxed line-clamp-3 mb-3 flex-1">
          {article.description}
        </p>
      )}

      {/* Meta footer */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-light-border/40 dark:border-dark-border/40">
        <div className="flex items-center gap-2 min-w-0">
          {article.source && (
            <span className="text-[11px] text-light-muted dark:text-dark-muted truncate">
              {article.source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <time className="text-[11px] text-light-muted/70 dark:text-dark-muted/70 tabular-nums">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })
              : ''}
          </time>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-light-muted/50 dark:text-dark-muted/50 hover:text-accent dark:hover:text-accent-dark transition-colors"
            title="阅读原文"
          >
            <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </article>
  );
}