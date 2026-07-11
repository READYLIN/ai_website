'use client';

import { useCallback, useState } from 'react';
import { Article } from '@/lib/types';
import { cleanDisplayText } from '@/lib/display-text';

function normalize(value?: string) {
  return cleanDisplayText(value).toLocaleLowerCase('zh-CN');
}

export function useSearch(articles: Article[]) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);

  const search = useCallback((searchQuery: string) => {
    const nextQuery = searchQuery.trim();
    setQuery(nextQuery);

    if (!nextQuery) {
      setResults([]);
      return;
    }

    const terms = normalize(nextQuery).split(/\s+/).filter(Boolean);
    const matched = articles.filter((article) => {
      const searchable = normalize([
        article.title,
        article.titleZh,
        article.description,
        article.descriptionZh,
        article.source,
        ...article.categories,
      ].filter(Boolean).join(' '));
      return terms.every((term) => searchable.includes(term));
    });

    setResults(matched);
  }, [articles]);

  return { query, results, isSearching: false, search };
}
