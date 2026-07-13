import { getTrending } from '@/lib/trending';
import ArticleCard from './ArticleCard';

export default function TrendingSection({ articles }: { articles: any[] }) {
  const trending = getTrending(articles);
  if (trending.length < 3) return null;

  return (
    <section className="mb-10" aria-labelledby="trending-heading">
      <div className="mb-4">
        <span className="section-label">Trending</span>
        <h2 id="trending-heading" className="mt-1 font-display text-2xl font-bold">今日热门</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {trending.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </section>
  );
}