'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar({ initialValue = '' }: { initialValue?: string }) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [query, router]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('search-input')?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => setQuery(initialValue), [initialValue]);

  return (
    <form onSubmit={handleSearch} className="relative" role="search">
      <label htmlFor="search-input" className="sr-only">搜索全部文章</label>
      <input
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='搜索标题、摘要、来源或分类…'
        className="input-search py-3 pl-11 pr-20"
        autoComplete="off"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-muted dark:text-dark-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-light-border px-1.5 py-0.5 font-mono text-[10px] text-light-muted dark:border-dark-border dark:text-dark-muted sm:block">/</span>
    </form>
  );
}
