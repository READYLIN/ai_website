'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Article } from '@/lib/types';
import { articleDisplayCopy } from '@/lib/display-text';
import BookmarkButton from './BookmarkButton';

function publishedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Shanghai',
  });
}

export default function FeaturedArticle({ article, linkPrefix = '/articles/' }: { article: Article; linkPrefix?: string }) {
  const [imgError, setImgError] = useState(false);
  const copy = articleDisplayCopy(article);

  return (
    <article className="group relative rounded-card-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface overflow-hidden mb-10 animate-fade-in">
      <div className="grid md:grid-cols-2">
        {article.imageUrl && !imgError ? (
          <Link href={`${linkPrefix}${article.id}`} className="block relative aspect-[16/10] md:aspect-auto overflow-hidden bg-light-border dark:bg-dark-border order-1 md:order-2">
            <Image
              src={article.imageUrl}
              alt={copy.title}
              fill
              className="object-cover grayscale-[35%] transition-all duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.03]"
              onError={() => setImgError(true)}
              priority
            />
          </Link>
        ) : (
          <div className="hidden md:block order-2 bg-gradient-to-br from-accent/10 to-accent-dark/10 dark:from-accent-dark/10 dark:to-accent/10" />
        )}

        <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center order-2 md:order-1">
          <div className="flex items-center gap-2 mb-4 text-xs">
            <span className="cursor-mark" aria-hidden="true" />
            <span className="section-label text-accent dark:text-accent-dark">头条</span>
          </div>

          <Link href={`${linkPrefix}${article.id}`} className="rounded-sm">
            <h2 className="font-display font-bold text-display-md leading-tight mb-3 group-hover:text-accent dark:group-hover:text-accent-dark transition-colors duration-200">
              {copy.title}
            </h2>
          </Link>
          {copy.originalTitle && (
            <p className="text-sm text-light-muted dark:text-dark-muted italic mb-3 line-clamp-1">{copy.originalTitle}</p>
          )}

          <p className="text-light-muted dark:text-dark-muted leading-relaxed line-clamp-3 mb-6">
            {copy.description || '打开文章查看完整内容。'}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-light-muted dark:text-dark-muted">
              <span className="flex items-center gap-1.5"><span className="text-base">{article.sourceIcon}</span><span className="font-medium">{article.source}</span></span>
              <span className="text-light-border dark:text-dark-border">·</span>
              <time className="font-mono text-[11px]">{publishedDate(article.publishedAt)}</time>
            </div>
            <BookmarkButton articleId={article.id} />
          </div>

          <Link
            href={`${linkPrefix}${article.id}`}
            className="inline-flex items-center gap-1.5 mt-6 text-sm font-medium text-accent dark:text-accent-dark w-fit group/link"
          >
            阅读全文
            <svg className="w-4 h-4 transition-transform duration-200 group-hover/link:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
