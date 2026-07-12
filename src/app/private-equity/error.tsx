'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[private-equity] page error:', error); }, [error]);

  return (
    <div className="container-site py-20 text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-2xl font-bold">!</div>
      <h1 className="font-display text-2xl font-bold mb-3">页面加载异常</h1>
      <p className="text-light-muted dark:text-dark-muted mb-6 max-w-md mx-auto">
        数据可能暂时不可用，请稍后重试。
      </p>
      <button onClick={reset} className="btn-primary">重新加载</button>
    </div>
  );
}