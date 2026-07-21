import { fetchPEIntel, getPEGroups, getPEDimensions } from '@/lib/pe-intel';
import { serialize } from '@/lib/serialize';
import IntelligenceExplorer from '@/components/IntelligenceExplorer';
import NewsletterCTA from '@/components/NewsletterCTA';
import { PRIVATE_EQUITY_COMPANY_COUNT } from '@/lib/private-equity-companies';

export const revalidate = 300;

export default async function PrivateEquityPage() {
  const allArticles = serialize(await fetchPEIntel());
  const groups = getPEGroups(allArticles);
  const dimensions = getPEDimensions(allArticles);

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
          追踪 {PRIVATE_EQUITY_COMPANY_COUNT} 家投中网榜单投资机构的募资、投资、融资、并购与退出动态。本期报告覆盖 {companies.size} 家机构。
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

      <IntelligenceExplorer
        articles={allArticles}
        groups={groups}
        dimensions={dimensions}
        linkPrefix="/private-equity/"
        priorityCompanies={['德同资本']}
        otherLast
      />

      <NewsletterCTA />
    </div>
  );
}
