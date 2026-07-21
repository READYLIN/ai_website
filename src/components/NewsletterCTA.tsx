'use client';

import { useState } from 'react';
import {
  NEWSLETTER_TOPICS,
  NEWSLETTER_TOPIC_META,
  NewsletterTopic,
} from '@/lib/newsletter';

export default function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [topics, setTopics] = useState<NewsletterTopic[]>([...NEWSLETTER_TOPICS]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allSelected = topics.length === NEWSLETTER_TOPICS.length;

  const toggleAll = () => {
    setTopics(allSelected ? [] : [...NEWSLETTER_TOPICS]);
    setError('');
  };

  const toggleTopic = (topic: NewsletterTopic) => {
    setTopics((current) => current.includes(topic)
      ? current.filter((item) => item !== topic)
      : [...current, topic]);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }
    if (topics.length === 0) {
      setError('请至少选择一个订阅栏目');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, topics }),
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
    <section id="newsletter" className="relative overflow-hidden rounded-card-lg bg-accent px-5 py-8 text-white shadow-[0_24px_60px_-36px_rgba(181,78,46,0.85)] sm:px-9 sm:py-10 lg:px-11">
      <div className="pointer-events-none absolute -right-10 -top-16 font-display text-[13rem] font-bold leading-none text-white/[0.055]" aria-hidden="true">信</div>
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(34rem,1.3fr)] lg:items-start">
        <div>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Your briefing, your choice</span>
          <h2 className="mt-3 max-w-lg font-display text-3xl font-bold leading-tight">只收到你真正关心的资讯</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/78">AI、传媒、私募可以单独订阅，也可以全部选择。我们按栏目发送，不把无关内容塞进同一封邮件。</p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em] text-white/65">
            <span>云端保存偏好</span>
            <span aria-hidden="true">·</span>
            <span>可随时退订</span>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm" aria-live="polite">
            <p className="font-display text-xl font-semibold">订阅偏好已保存</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              已选择：{topics.map((topic) => NEWSLETTER_TOPIC_META[topic].label).join('、')}。请留意邮箱中的确认邮件。
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-sm text-white/80 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white"
            >
              修改或使用其他邮箱
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <fieldset>
              <div className="mb-2.5 flex items-center justify-between gap-4">
                <legend className="text-sm font-medium">选择栏目</legend>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white"
                >
                  {allSelected ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {NEWSLETTER_TOPICS.map((topic) => {
                  const selected = topics.includes(topic);
                  const meta = NEWSLETTER_TOPIC_META[topic];
                  return (
                    <label
                      key={topic}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 active:scale-[0.99] ${selected ? 'border-white/55 bg-white text-light-text shadow-sm' : 'border-white/18 bg-white/[0.08] text-white hover:bg-white/[0.13]'}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected}
                        onChange={() => toggleTopic(topic)}
                      />
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-display text-base font-semibold">{meta.label}</span>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border text-xs ${selected ? 'border-accent bg-accent text-white' : 'border-white/35 text-transparent'}`} aria-hidden="true">✓</span>
                      </span>
                      <span className={`mt-1.5 block text-xs leading-relaxed ${selected ? 'text-light-muted' : 'text-white/65'}`}>{meta.description}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur-sm">
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="newsletter-email" className="sr-only">邮箱地址</label>
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white px-4 py-3.5 text-base text-light-text outline-none placeholder:text-light-muted/70 focus:border-white focus:ring-2 focus:ring-white/40 sm:text-sm"
                  autoComplete="email"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="whitespace-nowrap rounded-lg bg-light-text px-5 py-3.5 text-sm font-medium text-white transition-all hover:-translate-y-0.5 hover:bg-black active:scale-[0.98] disabled:cursor-wait disabled:opacity-55"
                >
                  {loading ? '保存中…' : '保存订阅偏好'}
                </button>
              </div>
              {error && <p className="px-2 pb-1 pt-2 text-xs text-white" role="alert">{error}</p>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
