import { fetchAllPapers } from '@/lib/paper-fetcher';
import { serialize } from '@/lib/serialize';
import PaperExplorer from '@/components/PaperExplorer';

export const revalidate = 300;

export default async function PapersPage() {
  const allPapers = serialize(await fetchAllPapers()).map((paper) => ({
    ...paper,
    abstract: paper.abstract.slice(0, 700),
  }));

  return (
    <div className="container-site py-8 sm:py-12">
      <section className="mb-10 border-b border-light-border/70 pb-10 dark:border-dark-border/70 animate-fade-in">
        <div className="page-eyebrow">
          <span className="cursor-mark" aria-hidden="true" />
          <span className="section-label">Research desk · 每日更新</span>
        </div>
        <h1 className="font-display text-display-xl font-bold tracking-tight mb-3">
          AI 论文
        </h1>
        <p className="text-light-muted dark:text-dark-muted text-lg max-w-2xl leading-relaxed">
          汇总 arXiv 等开放学术信源，覆盖语言模型、视觉、机器学习与机器人研究。
        </p>
        <p className="mt-5 font-mono text-xs text-light-muted dark:text-dark-muted">当前索引 {allPapers.length} 篇论文</p>
      </section>

      <PaperExplorer papers={allPapers} />
    </div>
  );
}
