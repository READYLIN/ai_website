'use client';

import { useState, useEffect } from 'react';
import { Article } from '@/lib/types';
import { getBookmarks } from '@/lib/bookmarks';
import ArticleList from '@/components/ArticleList';
import Link from 'next/link';

export default function BookmarksPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bookmarkIds = getBookmarks();
    if (bookmarkIds.length === 0) {
      setLoading(false);
      return;
    }

    fetch('/api/articles')
      .then((res) => res.json())
      .then((data: Article[]) => {
        const saved = data.filter((a) => bookmarkIds.includes(a.id));
        setArticles(saved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 border-b border-light-border/70 pb-8 dark:border-dark-border/70">
        <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Saved locally</span></div>
        <h1 className="font-display text-display-md font-bold tracking-tight mb-3">
          收藏夹
        </h1>
        <p className="text-light-muted dark:text-dark-muted">
          收藏仅保存在当前浏览器中，不需要登录。
        </p>
      </section>

      <section>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" aria-label="正在加载收藏">
            {[0, 1, 2].map((item) => <div key={item} className="card min-h-56"><div className="skeleton-line mb-4 h-3 w-1/3" /><div className="skeleton-line mb-2 h-5 w-full" /><div className="skeleton-line h-5 w-4/5" /></div>)}
          </div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark" aria-hidden="true">◇</div>
            <h2 className="font-display text-xl font-semibold">还没有收藏内容</h2>
            <p className="mx-auto mt-2 mb-6 max-w-sm text-sm text-light-muted dark:text-dark-muted">在文章卡片上点击书签图标，稍后就能在这里继续阅读。</p>
            <Link href="/" className="btn-primary inline-flex">浏览最新资讯</Link>
          </div>
        ) : (
          <ArticleList articles={articles} />
        )}
      </section>
    </div>
  );
}
