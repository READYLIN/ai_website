import { fetchArticleById } from '@/lib/fetcher';
import { serialize } from '@/lib/serialize';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import SanitizedHTML from '@/components/SanitizedHTML';
import BookmarkButton from '@/components/BookmarkButton';
import { articleDisplayCopy } from '@/lib/display-text';
import RelatedArticles from '@/components/RelatedArticles';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import ShareBar from '@/components/ShareBar';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const found = await fetchArticleById(params.slug);
  if (!found) return { title: '文章未找到' };
  const article = serialize(found);

  const { title, description } = articleDisplayCopy(article);

  return {
    title: `${title} — AI 新闻中心`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: article.url,
      images: article.imageUrl ? [{ url: article.imageUrl, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.imageUrl ? [article.imageUrl] : [],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const found = await fetchArticleById(params.slug);
  if (!found) {
    notFound();
  }
  const article = serialize(found);
  const copy = articleDisplayCopy(article);
  const visibleCategories = article.categories.filter((category) => category.length <= 28).slice(0, 6);

  return (
    <div className="container-site max-w-3xl py-8 sm:py-12">
      <BreadcrumbNav items={[
        { href: '/', label: 'AI资讯' },
        { href: `/${(article.categories || ['未分类'])[0]}`, label: (article.categories || ['文章'])[0] },
      ]} />
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-light-muted dark:text-dark-muted hover:text-accent dark:hover:text-accent-dark transition-colors mb-8 group"
      >
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        返回首页
      </Link>

      <article className="animate-fade-in">
        <div className="mb-5 flex items-start justify-between gap-5">
          <div className="flex flex-wrap items-center gap-2.5 text-sm text-light-muted dark:text-dark-muted">
            <span className="text-base">{article.sourceIcon}</span>
            <span className="font-medium">{article.source}</span>
            <span className="text-light-border dark:text-dark-border">·</span>
            <time className="font-mono text-xs">
              {new Date(article.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
            {article.author && typeof article.author === 'string' && article.author !== article.source && (
              <><span className="text-light-border dark:text-dark-border">·</span><span className="max-w-48 truncate">{article.author}</span></>
            )}
          </div>
          <BookmarkButton articleId={article.id} />
        </div>

        <h1 className="font-display text-display-lg font-bold tracking-tight leading-tight mb-2">
          {copy.title}
        </h1>
        {copy.originalTitle && (
          <h2 className="font-display text-xl text-light-muted dark:text-dark-muted mb-6">
            {copy.originalTitle}
          </h2>
        )}

        {article.imageUrl && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <Image
              src={article.imageUrl}
              alt={copy.title}
              width={1200}
              height={675}
              className="w-full aspect-video object-cover"
              priority
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {visibleCategories.map((cat) => (
            <Link
              key={cat}
              href={`/categories/${encodeURIComponent(cat)}`}
              className="badge"
            >
              {cat}
            </Link>
          ))}
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <div className="p-5 rounded-xl bg-accent/5 dark:bg-accent-dark/10 border border-accent/10 dark:border-accent-dark/10 mb-8">
            <p className="text-lg leading-relaxed text-light-text dark:text-dark-text font-medium">
              {copy.description || '该信源未提供摘要，请查看正文或访问原始来源。'}
            </p>
          </div>

          {copy.originalDescription && (
            <p className="text-base leading-relaxed text-light-muted dark:text-dark-muted mb-6 italic">
              {copy.originalDescription}
            </p>
          )}

          {article.contentZh && (
            <SanitizedHTML
              html={article.contentZh}
              className="[&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-6 [&>p]:mb-5 [&>p]:leading-[1.85] [&>h2]:mt-10 [&>h2]:mb-5 [&>h2]:font-display [&>h2]:font-semibold [&>h3]:mt-8 [&>h3]:mb-4 [&>h3]:font-display [&>h3]:font-semibold [&>ul]:my-5 [&>ul]:pl-6 [&>ul]:space-y-2.5 [&>li]:leading-relaxed [&>blockquote]:my-6 [&>blockquote]:border-l-4 [&>blockquote]:border-accent/40 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-light-muted dark:[&>blockquote]:text-dark-muted [&>strong]:text-light-text dark:[&>strong]:text-dark-text"
            />
          )}

          {article.contentZh && article.content && article.contentZh !== article.content && (
            <details className="group mt-12 border-t border-light-border pt-7 dark:border-dark-border">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg py-2 text-sm font-medium text-light-muted transition-colors hover:text-accent dark:text-dark-muted dark:hover:text-accent-dark">
                查看原文内容 / English original
                <span className="text-lg transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <SanitizedHTML html={article.content} className="mt-5 text-sm text-light-muted opacity-80 dark:text-dark-muted [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-6 [&>p]:mb-4 [&>p]:leading-relaxed [&>h2]:mt-8 [&>h2]:mb-4 [&>h3]:mt-6 [&>h3]:mb-3 [&>ul]:my-4 [&>ul]:pl-6 [&>ul]:space-y-2 [&>li]:leading-relaxed" />
            </details>
          )}

          {!article.contentZh && article.content && (
            <SanitizedHTML
              html={article.content}
              className="[&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-6 [&>p]:mb-5 [&>p]:leading-[1.85] [&>h2]:mt-10 [&>h2]:mb-5 [&>h2]:font-display [&>h2]:font-semibold [&>h3]:mt-8 [&>h3]:mb-4 [&>h3]:font-display [&>h3]:font-semibold [&>ul]:my-5 [&>ul]:pl-6 [&>ul]:space-y-2.5 [&>li]:leading-relaxed [&>blockquote]:my-6 [&>blockquote]:border-l-4 [&>blockquote]:border-accent/40 [&>blockquote]:pl-5 [&>blockquote]:italic [&>blockquote]:text-light-muted dark:[&>blockquote]:text-dark-muted [&>strong]:text-light-text dark:[&>strong]:text-dark-text"
            />
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-light-border pt-8 dark:border-dark-border">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            阅读原文
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <Link href="/" className="text-sm text-light-muted underline decoration-light-border underline-offset-4 hover:text-accent dark:text-dark-muted dark:decoration-dark-border dark:hover:text-accent-dark">继续浏览最新资讯</Link>
        </div>

        <ShareBar url={article.url} title={copy.title} />

        <RelatedArticles current={article} />
      </article>

      {/* JSON-LD structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: copy.title,
        description: copy.description,
        datePublished: article.publishedAt,
        author: { '@type': 'Organization', name: article.source },
        publisher: { '@type': 'Organization', name: 'AI 新闻中心', url: 'https://aiweb-roan.vercel.app' },
        url: article.url,
        ...(article.imageUrl ? { image: article.imageUrl } : {}),
      }) }} />
    </div>
  );
}
