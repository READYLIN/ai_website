'use client';

import { useEffect, useMemo, useState } from 'react';
import { Paper } from '@/lib/types';
import { arxivCategories } from '@/lib/paper-sources';
import PaperList from './PaperList';

export default function PaperExplorer({ papers }: { papers: Paper[] }) {
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category') || '');
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const categoryCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const paper of papers) {
      for (const category of paper.categories) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
    }
    return counts;
  }, [papers]);

  const categories = useMemo(() => arxivCategories
    .filter((category) => categoryCount.has(category.id))
    .sort((a, b) => (categoryCount.get(b.id) || 0) - (categoryCount.get(a.id) || 0)), [categoryCount]);

  const filtered = useMemo(() => activeCategory
    ? papers.filter((paper) => paper.categories.some((category) => category.toLowerCase() === activeCategory.toLowerCase()))
    : papers, [activeCategory, papers]);

  const selectCategory = (category: string) => {
    setActiveCategory(category);
    const url = new URL(window.location.href);
    if (category) url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  return (
    <>
      <section className="mb-8">
        <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="论文分类">
          <button
            type="button"
            onClick={() => selectCategory('')}
            aria-pressed={!activeCategory}
            className={`badge whitespace-nowrap transition-all duration-200 ${
              !activeCategory ? 'bg-accent text-white border-accent shadow-sm' : 'hover:border-accent/40 dark:hover:border-accent-dark/40'
            }`}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              aria-pressed={activeCategory === category.id}
              className={`badge whitespace-nowrap transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'hover:border-accent/40 dark:hover:border-accent-dark/40'
              }`}
            >
              {category.icon} {category.name}
              <span className="ml-1 text-[10px] opacity-60">{categoryCount.get(category.id)}</span>
            </button>
          ))}
        </nav>
      </section>

      <section className="mb-16">
        <PaperList key={activeCategory || 'all'} papers={filtered} />
      </section>
    </>
  );
}
