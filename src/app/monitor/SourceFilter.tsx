'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Article } from '@/lib/types';
import ArticleList from '@/components/ArticleList';

interface SourceGroup {
  label: string;
  sources: string[];
}

export default function SourceFilter({ groups, articles }: { groups: SourceGroup[]; articles: Article[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialSource = searchParams.get('source');
  const [selectedSource, setSelectedSource] = useState<string | null>(initialSource);

  useEffect(() => {
    setSelectedSource(searchParams.get('source'));
  }, [searchParams]);

  const filtered = selectedSource
    ? articles.filter(a => a.categories.includes(selectedSource))
    : articles;
  const sourceCounts = new Map<string, number>();
  for (const article of articles) {
    for (const category of article.categories) sourceCounts.set(category, (sourceCounts.get(category) || 0) + 1);
  }
  const visibleGroups = groups
    .map((group) => ({ ...group, sources: group.sources.filter((source) => (sourceCounts.get(source) || 0) > 0) }))
    .filter((group) => group.sources.length > 0);

  const handleSelect = (source: string | null) => {
    setSelectedSource(source);
    const params = new URLSearchParams(searchParams);
    if (source) {
      params.set('source', source);
    } else {
      params.delete('source');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div>
      <div className="mb-8 rounded-card-lg border border-light-border bg-light-surface/70 p-4 dark:border-dark-border dark:bg-dark-surface/70 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="section-label">按信源筛选</p>
          <button
            onClick={() => handleSelect(null)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              !selectedSource
                ? 'bg-accent text-white border-accent'
                : 'border-light-border dark:border-dark-border hover:border-accent dark:hover:border-accent-dark'
            }`}
          >
            全部 ({articles.length})
          </button>
        </div>
        <div className="space-y-4">
        {visibleGroups.map(group => (
          <div key={group.label}>
            <p className="text-xs text-light-muted dark:text-dark-muted mb-2 font-medium tracking-wider uppercase">
              {group.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.sources.map(source => (
                <button
                  key={source}
                  onClick={() => handleSelect(selectedSource === source ? null : source)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors active:scale-[0.98] ${
                    selectedSource === source
                      ? 'bg-accent text-white border-accent'
                      : 'border-light-border dark:border-dark-border hover:border-accent dark:hover:border-accent-dark'
                  }`}
                >
                  {source} <span className="ml-1 font-mono text-[10px] opacity-60">{sourceCounts.get(source) || 0}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>

      {selectedSource && (
        <p className="text-sm text-light-muted dark:text-dark-muted mb-4">
          当前筛选：<span className="font-medium text-light-text dark:text-dark-text">{selectedSource}</span>
          {' '}({filtered.length} 篇)
          <button
            onClick={() => handleSelect(null)}
            className="ml-2 text-accent hover:text-accent-dark underline"
          >
            清除
          </button>
        </p>
      )}

      <ArticleList articles={filtered} linkPrefix="/monitor/" />
    </div>
  );
}
