'use client';

import { useSyncExternalStore, useCallback, useState, useEffect } from 'react';
import { getBookmarks, addBookmark, removeBookmark } from '@/lib/bookmarks';

/**
 * Subscribe to bookmark changes from any tab/instance.
 */
function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener('bookmarks-changed', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('bookmarks-changed', cb);
  };
}

function getSnapshot(): string[] {
  return getBookmarks();
}

export function useBookmarks() {
  const [mounted, setMounted] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const handler = () => setBookmarks(getBookmarks());
    window.addEventListener('storage', handler);
    window.addEventListener('bookmarks-changed', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('bookmarks-changed', handler);
    };
  }, [mounted]);

  const toggle = useCallback((articleId: string) => {
    const current = getBookmarks();
    if (current.includes(articleId)) {
      removeBookmark(articleId);
    } else {
      addBookmark(articleId);
    }
    setBookmarks(getBookmarks());
    window.dispatchEvent(new Event('bookmarks-changed'));
  }, []);

  const isSaved = useCallback(
    (articleId: string) => bookmarks.includes(articleId),
    [bookmarks]
  );

  return { bookmarks, toggle, isSaved };
}