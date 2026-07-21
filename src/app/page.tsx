import { fetchAllArticles } from '@/lib/fetcher';
import { serialize } from '@/lib/serialize';
import ArticleList from '@/components/ArticleList';
import CategoryNav from '@/components/CategoryNav';
import NewsletterCTA from '@/components/NewsletterCTA';
import TrendingSection from '@/components/TrendingSection';

export const revalidate = 300;

export default async function HomePage() {
  const articles = serialize(await fetchAllArticles()).map(({ content: _content, contentZh: _contentZh, ...article }) => article);
  const sourceCount = new Set(articles.map((article) => article.source)).size;
  const latest = articles[0]?.publishedAt
    ? new Date(articles[0].publishedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '等待更新';

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 grid items-end gap-8 border-b border-light-border/70 pb-10 dark:border-dark-border/70 md:grid-cols-[minmax(0,1fr)_19rem] animate-fade-in">
        <div>
          <div className="page-eyebrow">
            <span className="cursor-mark" aria-hidden="true" />
            <span className="section-label">每日更新 · 中英双语</span>
          </div>
          <h1 className="font-display text-display-xl font-bold tracking-tight mb-4 max-w-3xl">
            看懂今天的<br className="hidden sm:block" /> AI 变化
          </h1>
          <p className="text-light-muted dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
            聚合全球 AI 新闻、前沿论文与产业信号，保留原始来源，帮你更快判断什么值得关注。
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 border-l-0 border-light-border/70 dark:border-dark-border/70 md:grid-cols-1 md:border-l md:pl-7">
          <div className="min-w-0">
            <dt className="section-label mb-1">本期内容</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{articles.length}<span className="ml-1 text-xs font-sans font-normal text-light-muted dark:text-dark-muted">篇</span></dd>
          </div>
          <div className="min-w-0">
            <dt className="section-label mb-1">信源</dt>
            <dd className="font-display text-2xl font-bold tabular-nums">{sourceCount}<span className="ml-1 text-xs font-sans font-normal text-light-muted dark:text-dark-muted">个</span></dd>
          </div>
          <div className="min-w-0">
            <dt className="section-label mb-1">最近更新</dt>
            <dd className="font-mono text-xs font-medium leading-6 tabular-nums">{latest}</dd>
          </div>
        </dl>
      </section>

      <TrendingSection articles={articles} />

      <section className="mb-8" aria-labelledby="latest-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <span className="section-label">Latest dispatches</span>
            <h2 id="latest-heading" className="mt-1 font-display text-2xl font-bold">最新资讯</h2>
          </div>
          <span className="hidden text-xs text-light-muted dark:text-dark-muted sm:block">按发布时间排序</span>
        </div>
        <CategoryNav articles={articles} />
      </section>

      <section className="mb-16">
        <ArticleList articles={articles} showFeatured />
      </section>

      <NewsletterCTA />
    </div>
  );
}
