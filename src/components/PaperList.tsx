'use client';

import { useState } from 'react';
import { Paper } from '@/lib/types';
import PaperCard from './PaperCard';
import Pagination from './Pagination';

const PAGE_SIZE = 12;

export default function PaperList({ papers }: { papers: Paper[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(papers.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const visible = papers.slice(start, start + PAGE_SIZE);

  if (papers.length === 0) {
    return (
      <div className="empty-state">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 font-mono text-xs font-bold text-accent dark:bg-accent-dark/10 dark:text-accent-dark" aria-hidden="true">AX</div>
        <h2 className="font-display text-xl font-semibold">论文索引正在等待更新</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-light-muted dark:text-dark-muted">arXiv 通常在工作日更新；新论文进入开放信源后会自动出现在这里。</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((paper, index) => (
          <PaperCard
            key={paper.id}
            paper={paper}
            style={{ animationDelay: `${index * 60}ms` }}
          />
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => {
          setPage(p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
