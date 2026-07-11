'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

interface CategoryNavProps {
  active?: string;
  articles?: { categories: string[] }[];
}

export default function CategoryNav({ active, articles }: CategoryNavProps) {
  const [expanded, setExpanded] = useState(false);
  const categories = useMemo(() => {
    const fallback = ['AI', '机器学习', '大语言模型', '计算机视觉', '机器人', '创业', '科技', '开源'];
    if (!articles?.length) return fallback.map((name) => ({ name, count: 0 }));

    const counts = new Map<string, number>();
    for (const article of articles) {
      for (const category of article.categories) {
        const name = category.trim();
        if (name && name.length <= 28) counts.set(name, (counts.get(name) || 0) + 1);
      }
    }

    const priority = [
      'AI', '大语言模型', '机器学习', 'AI Agent', 'Agents', 'Research', '机器人',
      '开源', '创业', '科技', 'OpenAI', 'Anthropic', 'Google', 'Microsoft', 'Meta',
    ];
    const result: Array<{ name: string; count: number }> = [];
    for (const name of priority) {
      if (counts.has(name)) result.push({ name, count: counts.get(name) || 0 });
    }
    for (const [name, count] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
      if (!result.some((item) => item.name === name)) result.push({ name, count });
    }
    if (active && counts.has(active) && !result.slice(0, 24).some((item) => item.name === active)) {
      result.unshift({ name: active, count: counts.get(active) || 0 });
    }
    return result;
  }, [active, articles]);

  const initialLimit = 11;
  const visible = expanded ? categories.slice(0, 24) : categories.slice(0, initialLimit);
  const hasMore = categories.length > initialLimit;

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="文章分类">
      <Link href="/" className={`badge whitespace-nowrap ${!active ? 'bg-accent text-white border-accent shadow-sm' : ''}`}>
        全部
      </Link>
      {visible.map(({ name, count }) => (
        <Link key={name} href={`/categories/${encodeURIComponent(name)}`} className={`badge whitespace-nowrap ${active === name ? 'bg-accent text-white border-accent shadow-sm' : ''}`}>
          {name}
          {count > 0 && <span className="ml-1 font-mono text-[10px] opacity-60">{count}</span>}
        </Link>
      ))}
      {hasMore && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="px-2.5 py-1 text-xs font-medium text-accent dark:text-accent-dark hover:underline underline-offset-4" aria-expanded={expanded}>
          {expanded ? '收起' : `更多 +${Math.min(categories.length, 24) - initialLimit}`}
        </button>
      )}
    </nav>
  );
}
