'use client';

import { useState, useEffect, useCallback } from 'react';

const HISTORY_KEY = 'ai-news-reading-history';
const MAX_HISTORY = 50;

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveHistory(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(ids.slice(0, MAX_HISTORY))); } catch {}
}

export function useReadingHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setHistory(getHistory()); setMounted(true); }, []);

  const markRead = useCallback((id: string) => {
    const current = getHistory();
    if (!current.includes(id)) {
      const updated = [id, ...current];
      saveHistory(updated);
      setHistory(updated);
    }
  }, []);

  const isRead = useCallback((id: string) => history.includes(id), [history]);

  return { history, markRead, isRead, mounted };
}