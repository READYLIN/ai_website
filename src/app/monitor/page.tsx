import { fetchMediaArticles, getSourceGroups } from '@/lib/media-fetcher';
import { serialize } from '@/lib/serialize';
import SourceFilter from './SourceFilter';

export const dynamic = 'force-dynamic';

export default async function MonitorPage() {
  const articles = serialize(await fetchMediaArticles());
  const groups = getSourceGroups();

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 border-b border-light-border/70 pb-10 dark:border-dark-border/70 animate-fade-in">
        <div className="page-eyebrow">
          <span className="cursor-mark" aria-hidden="true" />
          <span className="section-label">Industry watch · 产业监控</span>
        </div>
        <h1 className="font-display text-display-xl font-bold tracking-tight mb-3">
          传媒监控
        </h1>
        <p className="text-light-muted dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
          追踪主流媒体动态与上市公司公告，覆盖人民网、新华网、央视、证券时报及沪深交易所公告。
        </p>
        <p className="mt-5 font-mono text-xs text-light-muted dark:text-dark-muted">已收录 {articles.length} 条动态 · {groups.reduce((total, group) => total + group.sources.length, 0)} 个监控信源</p>
      </section>

      <section className="mb-8">
        <SourceFilter groups={groups} articles={articles} />
      </section>
    </div>
  );
}
