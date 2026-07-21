'use client';

import { useEffect, useMemo, useState } from 'react';
import { IntelArticle } from '@/lib/types';
import GroupedIntelList from './GroupedIntelList';

interface IntelligenceExplorerProps {
  articles: IntelArticle[];
  groups: string[];
  dimensions?: string[];
  linkPrefix: string;
  priorityCompanies?: string[];
  otherLast?: boolean;
}

function readFilters() {
  if (typeof window === 'undefined') return { group: '', dimension: '' };
  const params = new URLSearchParams(window.location.search);
  return {
    group: params.get('group') || '',
    dimension: params.get('dimension') || '',
  };
}

export default function IntelligenceExplorer({
  articles,
  groups,
  dimensions = [],
  linkPrefix,
  priorityCompanies = [],
  otherLast = false,
}: IntelligenceExplorerProps) {
  const [activeGroup, setActiveGroup] = useState('');
  const [activeDimension, setActiveDimension] = useState('');

  useEffect(() => {
    const syncFromUrl = () => {
      const filters = readFilters();
      setActiveGroup(filters.group);
      setActiveDimension(filters.dimension);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  const updateFilters = (group: string, dimension: string) => {
    setActiveGroup(group);
    setActiveDimension(dimension);

    const url = new URL(window.location.href);
    if (group) url.searchParams.set('group', group);
    else url.searchParams.delete('group');
    if (dimension) url.searchParams.set('dimension', dimension);
    else url.searchParams.delete('dimension');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const filtered = useMemo(() => articles.filter((article) => {
    if (activeGroup && article.companyGroup !== activeGroup) return false;
    if (activeDimension && article.dimension !== activeDimension) return false;
    return true;
  }), [activeDimension, activeGroup, articles]);

  return (
    <>
      {(groups.length > 1 || dimensions.length > 1) && (
        <section className="mb-8 space-y-4" aria-label="情报筛选">
          {groups.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilters('', activeDimension)}
                aria-pressed={!activeGroup}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !activeGroup
                    ? 'bg-accent text-white'
                    : 'bg-light-border/40 dark:bg-dark-border/40 text-light-text dark:text-dark-text hover:bg-light-border/60 dark:hover:bg-dark-border/60'
                }`}
              >
                全部
              </button>
              {groups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => updateFilters(group, activeDimension)}
                  aria-pressed={activeGroup === group}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeGroup === group
                      ? 'bg-accent text-white'
                      : 'bg-light-border/40 dark:bg-dark-border/40 text-light-text dark:text-dark-text hover:bg-light-border/60 dark:hover:bg-dark-border/60'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          )}

          {dimensions.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilters(activeGroup, '')}
                aria-pressed={!activeDimension}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !activeDimension
                    ? 'bg-accent/80 text-white'
                    : 'bg-light-border/30 dark:bg-dark-border/30 text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50'
                }`}
              >
                全部维度
              </button>
              {dimensions.map((dimension) => (
                <button
                  key={dimension}
                  type="button"
                  onClick={() => updateFilters(activeGroup, dimension)}
                  aria-pressed={activeDimension === dimension}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeDimension === dimension
                      ? 'bg-accent/80 text-white'
                      : 'bg-light-border/30 dark:bg-dark-border/30 text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50'
                  }`}
                >
                  {dimension}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mb-16">
        <GroupedIntelList
          key={`${activeGroup}\u0000${activeDimension}`}
          articles={filtered}
          linkPrefix={linkPrefix}
          priorityCompanies={priorityCompanies}
          otherLast={otherLast}
        />
      </section>
    </>
  );
}
