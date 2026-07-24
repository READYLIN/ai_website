'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import SettingsDialog from './SettingsDialog';
import AuthDialog from './AuthDialog';

interface AuthUser {
  id: string;
  username: string;
}

const NAV_LINKS = [
  { href: '/media', label: '传媒', icon: 'M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M13.5 4.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
  { href: '/private-equity', label: '私募', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/', label: 'AI资讯', icon: 'M4 6h16M4 12h10M4 18h7' },
  { href: '/papers', label: '论文', icon: 'M9 12h6m-6 4h6m1 5H8a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/bookmarks', label: '收藏夹', icon: 'M5 2h14a1 1 0 011 1v19.143a.5.5 0 01-.766.424L12 18.03l-7.234 4.536A.5.5 0 014 22.143V3a1 1 0 011-1z' },
  { href: '/topics', label: '观潮', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { href: '/generated-articles', label: '铸闻', icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z' },
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshMe = () => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null));
  };

  useEffect(() => {
    setTheme(getTheme());
    setMounted(true);
    refreshMe();
  }, []);

  // 点击「大模型配置」：已登录直接开配置，未登录先弹登录框
  const openConfig = () => {
    if (user) {
      setSettingsOpen(true);
    } else {
      setAuthMode('login');
      setAuthOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setUserMenuOpen(false);
    setSettingsOpen(false);
  };

  // 点外部关闭用户菜单
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
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
    <>
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-light-border/70 dark:border-dark-border/70 bg-light-bg/90 dark:bg-dark-bg/90 backdrop-blur-xl shadow-[0_1px_0_rgba(31,28,24,0.03)]'
          : 'border-transparent bg-light-bg/70 dark:bg-dark-bg/70 backdrop-blur-md'
      }`}
    >
      <div className={`container-site flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-14' : 'h-16'}`}>
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="新闻中心首页">
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
            <a
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
            </a>
          ))}
        </nav>

          <div className="flex items-center gap-2">
          {/* 显眼的大模型配置入口 */}
          <button
            onClick={openConfig}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/[0.06] px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 dark:border-accent-dark/40 dark:bg-accent-dark/[0.08] dark:text-accent-dark"
            aria-label="大模型配置"
            title="配置你的大模型 API Key"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.03 7.03 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            大模型配置
          </button>

          {/* 登录态：未登录显示「登录/注册」，已登录显示用户名下拉 */}
          {mounted && (user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-light-border px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-light-border/40 dark:border-dark-border dark:hover:bg-dark-border/40"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white dark:bg-accent-dark">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-[7rem] truncate sm:inline">{user.username}</span>
                <svg className="h-3.5 w-3.5 text-light-muted dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-light-border bg-white py-1 shadow-lg dark:border-dark-border dark:bg-zinc-900" role="menu">
                  <div className="px-3 py-2 text-xs text-light-muted dark:text-dark-muted">已登录：<span className="font-medium text-light-text dark:text-dark-text">{user.username}</span></div>
                  <button onClick={() => { setUserMenuOpen(false); setSettingsOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-light-border/40 dark:hover:bg-dark-border/40">大模型配置</button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 hover:bg-light-border/40 dark:hover:bg-dark-border/40">退出登录</button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setAuthMode('login'); setAuthOpen(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-accent-dark"
            >
              登录 / 注册
            </button>
          ))}
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
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-2 py-3.5 transition-colors ${isActive(link.href) ? 'text-accent dark:text-accent-dark' : 'text-light-text dark:text-dark-text hover:text-accent dark:hover:text-accent-dark'}`}
                aria-current={isActive(link.href) ? 'page' : undefined}
              >
                <svg className="w-[18px] h-[18px] text-light-muted dark:text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.icon} /></svg>
                {link.label}
              </a>
            ))}
            <button
              onClick={() => { setMobileNavOpen(false); openConfig(); }}
              className="flex items-center gap-3 px-2 py-3.5 text-left text-accent dark:text-accent-dark"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.03 7.03 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.542-.56.94-1.11.94h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" /></svg>
              大模型配置
            </button>
            {user ? (
              <button
                onClick={() => { setMobileNavOpen(false); handleLogout(); }}
                className="flex items-center gap-3 px-2 py-3.5 text-left text-red-500"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" /></svg>
                退出登录（{user.username}）
              </button>
            ) : (
              <button
                onClick={() => { setMobileNavOpen(false); setAuthMode('login'); setAuthOpen(true); }}
                className="flex items-center gap-3 px-2 py-3.5 text-left text-accent dark:text-accent-dark"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                登录 / 注册
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
    <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    <AuthDialog
      open={authOpen}
      initialMode={authMode}
      onClose={() => setAuthOpen(false)}
      onSuccess={(u) => { setUser(u); setAuthOpen(false); setSettingsOpen(true); }}
    />
    </>
  );
}
