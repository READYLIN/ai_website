import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — 页面未找到',
  description: '您访问的页面不存在。',
};

export default function NotFound() {
  return (
    <div className="container-site py-20 sm:py-28">
      <div className="mx-auto max-w-xl border-l-2 border-accent pl-7 sm:pl-10">
        <span className="section-label">Error 404</span>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl">这一页不在<br />今天的简报里</h1>
        <p className="mt-5 text-light-muted dark:text-dark-muted">链接可能已经失效，也可能输入有误。你可以回到首页继续浏览最新内容。</p>
        <Link href="/" className="btn-primary mt-8 inline-flex">返回首页</Link>
      </div>
    </div>
  );
}
