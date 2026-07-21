import { fetchAllMediaIntel, getMediaGroups } from '@/lib/media-intel';
import { serialize } from '@/lib/serialize';
import IntelligenceExplorer from '@/components/IntelligenceExplorer';
import NewsletterCTA from '@/components/NewsletterCTA';
import entityConfig from '../../../data/intelligence-entities.json';

export const revalidate = 300;

export default async function MediaPage() {
  const allArticles = serialize(await fetchAllMediaIntel());
  const groups = getMediaGroups(allArticles);

  const companies = new Set(allArticles.map((a) => a.company).filter(Boolean));

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
          追踪 {entityConfig.mediaConfiguredCount} 家媒体公司与机构经营动态，覆盖报业集团、广电系、户外媒体、央媒、出版传媒及未上市头部内容机构等分类。本期报告覆盖 {companies.size} 家公司。
        </p>
        <p className="mt-5 font-mono text-xs text-light-muted dark:text-dark-muted">
          已收录 {allArticles.length} 条情报 · {groups.length} 个分类
        </p>
      </section>

      <IntelligenceExplorer
        articles={allArticles}
        groups={groups}
        linkPrefix="/media/"
        priorityCompanies={['粤传媒']}
        otherLast
      />

      <NewsletterCTA />
    </div>
  );
}
