'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/media', label: '传媒', icon: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M13.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
  { href: '/private-equity', label: '私募', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/', label: 'AI资讯', icon: 'M4 6h16M4 12h10M4 18h7' },
  { href: '/papers', label: '论文', icon: 'M9 12h6m-6 4h6m1 5H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/bookmarks', label: '收藏夹', icon: 'M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z' },
];

function getTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const cls = document.documentElement.classList.contains('dark');
    return cls ? 'dark' : 'light';
  } catch { return 'light'; }
}

function toggleThemeImpl() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  try {
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  } catch {}
}

export default function Header() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleThemeToggle = () => {
    toggleThemeImpl();
    setTheme(getTheme());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-light-border/70 dark:border-dark-border/70 bg-light-bg/90 dark:bg-dark-bg/90 backdrop-blur-xl shadow-[0_1px_0_rgba(31,28,24,0.03)]'
          : 'border-transparent bg-light-bg/70 dark:bg-dark-bg/70 backdrop-blur-md'
      }`}
    >
      <div className={`container-site flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
        <Link href="/media" className="flex items-center gap-2.5 group" aria-label="新闻中心首页">
          <div className="relative w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center transition-transform duration-200 group-hover:-rotate-2 group-hover:scale-105 shadow-[0_6px_16px_-8px_rgba(181,78,46,0.85)]">
            <span className="text-white font-display font-bold text-sm">AI</span>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-light-bg bg-white dark:border-dark-bg" aria-hidden="true" />
          </div>
          <span className="hidden sm:block">
            <span className="block text-base font-display font-bold tracking-tight leading-none">新闻中心</span>
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.18em] text-light-muted dark:text-dark-muted">Intelligence hub</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-3 py-2 rounded-lg transition-colors group/link ${
                isActive(link.href)
                  ? 'text-accent dark:text-accent-dark bg-accent/[0.06] dark:bg-accent-dark/[0.08]'
                  : 'text-light-text dark:text-dark-text hover:bg-light-border/40 dark:hover:bg-dark-border/40'
              }`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
              <span className={`absolute left-3 right-3 -bottom-px h-px bg-accent dark:bg-accent-dark origin-left transition-transform duration-200 ${isActive(link.href) ? 'scale-x-100' : 'scale-x-0 group-hover/link:scale-x-100'}`} />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-lg text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors"
            aria-label="导航菜单"
            aria-expanded={mobileNavOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileNavOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center" role="search">
              <label htmlFor="header-search" className="sr-only">搜索文章</label>
              <input
                id="header-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标题、来源…"
                className="input-search w-32 pr-3 sm:w-48 md:w-64"
                autoFocus
              />
              <button type="submit" className="ml-1 p-1.5 rounded-lg text-accent dark:text-accent-dark hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors" aria-label="提交搜索">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14m-5-5 5 5-5 5" /></svg>
              </button>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="ml-1 p-1.5 rounded-lg text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors"
                aria-label="关闭搜索"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors"
              aria-label="搜索"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          )}

          {mounted && (
            <button
              onClick={handleThemeToggle}
              className="p-2 rounded-lg text-light-muted dark:text-dark-muted hover:bg-light-border/50 dark:hover:bg-dark-border/50 transition-colors"
              aria-label="切换深色模式"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {mobileNavOpen && (
        <nav className="md:hidden border-t border-light-border/60 dark:border-dark-border/60 bg-light-bg/95 dark:bg-dark-bg/95 backdrop-blur-xl animate-slide-up" style={{ animationDuration: '0.25s' }}>
          <div className="container-site flex flex-col py-2 divide-y divide-light-border/50 dark:divide-dark-border/50 text-sm font-medium">
            {NAV_LINKS.map((link) => (
                <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-2 py-3.5 transition-colors ${isActive(link.href) ? 'text-accent dark:text-accent-dark' : 'text-light-text dark:text-dark-text hover:text-accent dark:hover:text-accent-dark'}`}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                <svg className="w-[18px] h-[18px] text-light-muted dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.icon} /></svg>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}