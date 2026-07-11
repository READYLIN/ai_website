'use client';

import { useState } from 'react';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || '订阅失败，请稍后再试');
      }
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-card-lg bg-accent px-6 py-9 text-white shadow-[0_24px_60px_-36px_rgba(181,78,46,0.85)] sm:px-10 sm:py-11">
      <div className="pointer-events-none absolute -right-10 -top-16 font-display text-[13rem] font-bold leading-none text-white/[0.06]" aria-hidden="true">AI</div>
      <div className="relative grid items-end gap-7 md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.75fr)]">
        <div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Weekly signal</span>
          <h2 className="mt-3 max-w-lg font-display text-3xl font-bold leading-tight">一封更短、更有判断力的 AI 周报</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75">精选重要发布、论文和产业变化。只发值得你花时间阅读的内容。</p>
        </div>
        {submitted ? (
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" aria-live="polite">
            <p className="font-medium">订阅已记录，请留意确认邮件。</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-sm text-white/75 underline underline-offset-4 hover:text-white"
            >
              使用其他邮箱
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm" noValidate>
            <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">邮箱地址</label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white px-4 py-3 text-sm text-light-text outline-none placeholder:text-light-muted/70 focus:border-white focus:ring-2 focus:ring-white/40"
              autoComplete="email"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="whitespace-nowrap rounded-lg bg-light-text px-5 py-3 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-black active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? '提交中…' : '订阅周报'}
            </button>
            </div>
            {error && <p className="px-2 pt-2 text-xs text-white" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
