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
}: {
  article: IntelArticle;
  style?: React.CSSProperties;
}) {
  const priorityBadge = article.priority
    ? PRIORITY_COLORS[article.priority] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    : '';

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

      {/* Title */}
      <h3 className="font-display text-base font-semibold leading-snug mb-2 line-clamp-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-light-text dark:text-dark-text hover:text-accent dark:hover:text-accent-dark transition-colors"
        >
          {article.title}
        </a>
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
        <time className="text-[11px] text-light-muted/70 dark:text-dark-muted/70 tabular-nums shrink-0">
          {article.publishedAt
            ? new Date(article.publishedAt).toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
              })
            : ''}
        </time>
      </div>
    </article>
  );
}