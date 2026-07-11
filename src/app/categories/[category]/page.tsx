import { fetchAllArticles } from '@/lib/fetcher';
import { serialize } from '@/lib/serialize';
import ArticleList from '@/components/ArticleList';
import CategoryNav from '@/components/CategoryNav';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const category = decodeURIComponent(params.category);
  const allArticles = serialize(await fetchAllArticles());
  const articles = allArticles.filter((a) =>
    a.categories.some(
      (c) => c.toLowerCase() === category.toLowerCase()
    )
  );

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-8 border-b border-light-border/70 pb-8 dark:border-dark-border/70">
        <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Topic archive</span></div>
        <h1 className="font-display text-display-md font-bold tracking-tight mb-3">
          {category}
        </h1>
        <p className="font-mono text-xs text-light-muted dark:text-dark-muted">
          共 {articles.length} 篇文章
        </p>
      </section>

      <section className="mb-8">
        <CategoryNav active={category} articles={allArticles} />
      </section>

      <section>
        <ArticleList articles={articles} />
      </section>
    </div>
  );
}
