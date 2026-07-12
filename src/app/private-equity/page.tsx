import { fetchPEIntel, getPEGroups, getPEDimensions } from '@/lib/pe-intel';
import { serialize } from '@/lib/serialize';
import GroupedIntelList from '@/components/GroupedIntelList';

export const dynamic = 'force-dynamic';

interface PEPageProps {
  searchParams: { group?: string; dimension?: string };
}

export default async function PrivateEquityPage({ searchParams }: PEPageProps) {
  const allArticles = serialize(await fetchPEIntel());
  const groups = getPEGroups();
  const dimensions = getPEDimensions();
  const activeGroup = searchParams.group || '';
  const activeDim = searchParams.dimension || '';

  const filtered = allArticles.filter((a) => {
    if (activeGroup && a.companyGroup !== activeGroup) return false;
    if (activeDim && a.dimension !== activeDim) return false;
    return true;
  });

  const companies = new Set(allArticles.map((a) => a.company).filter(Boolean));
  const p0Count = allArticles.filter((a) => a.priority === 'P0').length;
  const p1Count = allArticles.filter((a) => a.priority === 'P1').length;
  const p2Count = allArticles.filter((a) => a.priority === 'P2').length;

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 border-b border-light-border/70 pb-10 dark:border-dark-border/70 animate-fade-in">
        <div className="page-eyebrow">
          <span className="cursor-mark" aria-hidden="true" />
          <span className="section-label">PE/VC Intelligence · 中国TOP私募股权GP动态周报</span>
        </div>
        <h1 className="font-display text-display-xl font-bold tracking-tight mb-3">
          私募股权
        </h1>
        <p className="text-light-muted dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
          追踪 435 家私募/创投管理人的募资、投资、退出、人事与合规动态，覆盖核心机构、活跃机构与观察名单。本期报告覆盖 {companies.size} 家机构。
        </p>

        {/* Stats row */}
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 p-4">
            <dt className="text-xs text-light-muted dark:text-dark-muted">总计</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{allArticles.length}</dd>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 p-4">
            <dt className="text-xs text-light-muted dark:text-dark-muted">P0 高优</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-red-600 dark:text-red-400">{p0Count}</dd>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 p-4">
            <dt className="text-xs text-light-muted dark:text-dark-muted">P1 中优</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">{p1Count}</dd>
          </div>
          <div className="rounded-xl border border-light-border/60 dark:border-dark-border/60 p-4">
            <dt className="text-xs text-light-muted dark:text-dark-muted">P2 低优</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-green-600 dark:text-green-400">{p2Count}</dd>
          </div>
        </dl>

        <p className="mt-5 font-mono text-xs text-light-muted dark:text-dark-muted">
          已收录 {allArticles.length} 条情报 · {companies.size} 个机构 · {groups.length} 个分类
        </p>
      </section>

      {/* Filters */}
      <section className="mb-8 space-y-4">
        {/* Group filter */}
        {groups.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <a
              href={activeDim ? `/private-equity?dimension=${encodeURIComponent(activeDim)}` : '/private-equity'}
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
                href={`/private-equity?group=${encodeURIComponent(g)}${activeDim ? `&dimension=${encodeURIComponent(activeDim)}` : ''}`}
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
        )}

        {/* Dimension filter */}
        {dimensions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {dimensions.map((d) => (
              <a
                key={d}
                href={`/private-equity?dimension=${encodeURIComponent(d)}${activeGroup ? `&group=${encodeURIComponent(activeGroup)}` : ''}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeDim === d
                    ? 'bg-accent/80 text-white'
                    : 'bg-light-border/30 dark:bg-dark-border/30 text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50'
                }`}
              >
                {d}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Paginated list */}
      <section className="mb-16">
        <GroupedIntelList articles={filtered} linkPrefix="/private-equity/" />
      </section>
    </div>
  );
}