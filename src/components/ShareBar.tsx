'use client';

import { useState } from 'react';

export default function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Generate a simple QR-like WeChat share hint
  // WeChat doesn't have a URL-based share API; we show a copy-link step
  return (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-light-border dark:border-dark-border">
      <span className="text-xs text-light-muted">分享：</span>
      <button
        onClick={copyLink}
        className="text-xs px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-border/30 transition-colors"
      >
        {copied ? '已复制 ✓' : '复制链接'}
      </button>
      <button
        onClick={copyLink}
        className="text-xs px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        微信分享
      </button>
      <span className="text-[10px] text-light-muted/70 ml-1 hidden sm:inline">
        点击"微信分享"复制链接，打开微信粘贴发送
      </span>
    </div>
  );
}