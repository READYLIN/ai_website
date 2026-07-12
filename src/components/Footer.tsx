import Link from 'next/link';

const primaryLinks = [
  { href: '/media', label: '传媒监控' },
  { href: '/private-equity', label: '私募股权' },
  { href: '/', label: 'AI资讯' },
  { href: '/papers', label: 'AI 论文' },
  { href: '/bookmarks', label: '收藏夹' },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-light-border/70 dark:border-dark-border/70">
      <div className="container-site py-10 sm:py-12">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 rounded-sm" aria-label="AI 新闻中心首页">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent font-display text-sm font-bold text-white">AI</span>
              <span className="font-display text-lg font-bold">新闻中心</span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-light-muted dark:text-dark-muted">
              聚合 AI 新闻、前沿论文、传媒经营动态与私募股权情报。每日更新，提供中文摘要并保留原始出处。
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm md:justify-end" aria-label="页脚导航">
            {primaryLinks.map((link) => <Link key={link.href} href={link.href} className="hover:text-accent dark:hover:text-accent-dark transition-colors">{link.label}</Link>)}
          </nav>
        </div>
        <div className="mt-9 flex flex-col gap-3 border-t border-light-border/50 pt-5 text-xs text-light-muted dark:border-dark-border/50 dark:text-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <span>内容版权归原作者及来源机构所有</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-accent dark:hover:text-accent-dark">隐私说明</Link>
            <Link href="/terms" className="hover:text-accent dark:hover:text-accent-dark">使用条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
