import { fetchAllMediaIntel, getMediaGroups } from '@/lib/media-intel';
import { serialize } from '@/lib/serialize';
import IntelCard from '@/components/IntelCard';

export const dynamic = 'force-dynamic';

interface MediaPageProps {
  searchParams: { group?: string };
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const allArticles = serialize(await fetchAllMediaIntel());
  const groups = getMediaGroups();
  const activeGroup = searchParams.group || '';

  const filtered = activeGroup
    ? allArticles.filter((a) => a.companyGroup === activeGroup)
    : allArticles;

  const companies = new Set(allArticles.map((a) => a.company).filter(Boolean));
  const totalTracked = 88; // from config.json: 7 categories, 88 companies total

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 border-b border-light-border/70 pb-10 dark:border-dark-border/70 animate-fade-in">
        <div className="page-eyebrow">
          <span className="cursor-mark" aria-hidden="true" />
          <span className="section-label">Media Intelligence · 传媒经营动态追踪</span>
        </div>
        <h1 className="font-display text-display-xl font-bold tracking-tight mb-3">
          传媒监控
        </h1>
        <p className="text-light-muted dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
          追踪 88 家媒体公司与机构经营动态，覆盖报业集团、广电系、户外媒体、央媒、出版传媒等七大分类。本期报告覆盖 {companies.size} 家公司。
        </p>
        <p className="mt-5 font-mono text-xs text-light-muted dark:text-dark-muted">
          已收录 {allArticles.length} 条情报 · {groups.length} 个分类
        </p>
      </section>

      {/* Group filter tabs */}
      {groups.length > 1 && (
        <section className="mb-8">
          <div className="flex flex-wrap gap-2">
            <a
              href="/media"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !activeGroup
                  ? 'bg-accent text-white'
                  : 'bg-light-border/40 dark:bg-dark-border/40 text-light-text dark:text-dark-text hover:bg-light-border/60 dark:hover:bg-dark-border/60'
              }`}
            >
              全部
            </a>
            {groups.map((g) => (
              <a
                key={g}
                href={`/media?group=${encodeURIComponent(g)}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeGroup === g
                    ? 'bg-accent text-white'
                    : 'bg-light-border/40 dark:bg-dark-border/40 text-light-text dark:text-dark-text hover:bg-light-border/60 dark:hover:bg-dark-border/60'
                }`}
              >
                {g}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Article grid */}
      <section className="mb-16">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent dark:bg-accent-dark/10 dark:text-accent-dark" aria-hidden="true">⌕</div>
            <h2 className="font-display text-xl font-semibold">暂无匹配内容</h2>
            <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">该分类下暂无数据。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((article, index) => (
              <IntelCard
                key={article.id}
                article={article}
                style={{ animationDelay: `${index * 60}ms` }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}