import { fetchAllArticles } from '@/lib/fetcher';
import ArticleCard from '@/components/ArticleCard';
import { Article } from '@/lib/types';

function scoreRelevance(a: Article, current: Article): number {
  let score = 0;
  const curCats = new Set((current.categories || []).map(c => c.toLowerCase()));
  const aCats = (a.categories || []).map(c => c.toLowerCase());
  for (const cat of aCats) {
    if (curCats.has(cat)) score += 3;
  }
  if (current.source && a.source === current.source) score += 2;
  return score;
}

export default async function RelatedArticles({ current }: { current: Article }) {
  let articles: Article[] = [];
  try {
    articles = await fetchAllArticles();
  } catch {
    return null;
  }

  const related = articles
    .filter(a => a.id !== current.id)
    .map(a => ({ article: a, score: scoreRelevance(a, current) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(r => r.article);

  if (related.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-light-border dark:border-dark-border">
      <h2 className="font-display text-xl font-bold mb-6">相关推荐</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {related.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}