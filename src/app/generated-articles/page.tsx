'use client';

// 铸闻工作台：今日推荐选题（自动选题 + 一键批量生成）+ 新建内容 + 稿件列表

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ARTICLE_TYPE_LABELS, STYLE_LABELS } from '@/lib/article-generator/config';
import type { GeneratedArticleSummary } from '@/lib/article-generator/repository';
import type { RecommendedTopic, BatchGenerateItem } from '@/lib/article-generator/service';
import NewArticleDialog from '@/components/NewArticleDialog';
import MarketNewsDialog from '@/components/MarketNewsDialog';

const VERIFY_META: Record<string, { label: string; cls: string }> = {
  unverified: { label: '未核查', cls: 'bg-zinc-500/10 text-zinc-500' },
  partial: { label: '部分可证', cls: 'bg-amber-500/12 text-amber-600 dark:text-amber-300' },
  verified: { label: '基本可证', cls: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300' },
  failed: { label: '存在未证实', cls: 'bg-rose-500/12 text-rose-600 dark:text-rose-300' },
};

export default function ZhuwenWorkbenchPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<GeneratedArticleSummary[] | null>(null);
  const [recs, setRecs] = useState<RecommendedTopic[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');
  const [singleBusy, setSingleBusy] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, rRes] = await Promise.all([
        fetch('/api/generated-articles'),
        fetch('/api/generated-articles/recommendations?limit=8'),
      ]);
      setArticles(aRes.ok ? (await aRes.json()).articles || [] : []);
      setRecs(rRes.ok ? (await rRes.json()).topics || [] : []);
    } catch {
      setArticles((v) => v ?? []);
      setRecs((v) => v ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleCheck = (cardId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
  };

  /** 一键批量生成：勾选优先；没勾选则自动取未生成的推荐选题前 5 张 */
  const batchGenerate = async () => {
    const pending = (recs || []).filter((t) => !t.articleId).map((t) => t.cardId);
    const ids = checked.size > 0 ? Array.from(checked) : pending.slice(0, 5);
    if (ids.length === 0) { setBatchMsg('没有可生成的选题（推荐选题均已生成）'); return; }
    setBatchBusy(true);
    setBatchMsg(`正在批量生成 ${ids.length} 篇稿件…（顺序执行，请稍候）`);
    try {
      const res = await fetch('/api/generated-articles/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量生成失败');
      const results: BatchGenerateItem[] = data.results || [];
      const fails = results.filter((r) => !r.ok);
      setBatchMsg(`批量完成：成功 ${data.okCount} 篇${fails.length ? `，失败 ${fails.length} 篇（${fails[0]?.error ?? ''}）` : ''}`);
      setChecked(new Set());
      await load();
    } catch (e) {
      setBatchMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBatchBusy(false);
    }
  };

  /** 单张选题快速生成（用推荐类型） */
  const generateOne = async (t: RecommendedTopic) => {
    setSingleBusy(t.cardId);
    try {
      const res = await fetch(`/api/topics/${t.cardId}/generate-article`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: t.suggestedType, targetLength: 600, style: 'financial_media' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      router.push(`/generated-articles/${data.id}`);
    } catch (e) {
      setBatchMsg(e instanceof Error ? e.message : String(e));
      setSingleBusy(null);
    }
  };

  return (
    <div className="container-site py-8 sm:py-12">
      <header className="mb-8">
        <div className="page-eyebrow">
          <span className="cursor-mark" aria-hidden="true" />
          <span className="section-label">识澜 · 铸闻</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-display-lg font-bold tracking-tight mb-3">铸闻工作台</h1>
            <p className="text-light-muted dark:text-dark-muted max-w-2xl leading-relaxed">
              自动推荐最值得写的选题，一键批量出稿；也可输入主题检索库内证据自由创作，或「生成大盘综述」直接调用免费行情源获取全市场指数与涨跌家数写稿。每篇稿件均附证据溯源、逐句核查与风险提示，发布前须人工审核。
            </p>
          </div>
          <button onClick={() => setNewOpen(true)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-accent-dark">
            ＋ 新建内容
          </button>
          <button onClick={() => setMarketOpen(true)}
            className="rounded-md border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 dark:border-accent-dark/60 dark:text-accent-dark">
            生成大盘综述
          </button>
        </div>
        <div className="mt-3 text-xs text-light-muted dark:text-dark-muted">
          生成依赖大模型：如需真实模型写作，请点右上角 <span className="font-medium text-accent dark:text-accent-dark">⚙ 设置</span> 填写 API Key 与模型参数；未配置时自动走规则回退（不调用模型，发布前须人工审核）。
        </div>
        <div className="mt-4">
          <Link href="/topics" className="text-sm text-accent dark:text-accent-dark hover:underline">← 返回观潮选题</Link>
        </div>
      </header>

      {loading && <div className="py-20 text-center text-light-muted dark:text-dark-muted">加载中…</div>}

      {/* ── 今日推荐选题 ─────────────────────────────── */}
      {!loading && recs && recs.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">今日推荐选题</h2>
            <div className="flex items-center gap-2">
              {batchMsg && <span className="text-xs text-light-muted dark:text-dark-muted">{batchMsg}</span>}
              <button onClick={batchGenerate} disabled={batchBusy}
                className="rounded-md border border-accent/60 px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 disabled:opacity-50 dark:border-accent-dark/60 dark:text-accent-dark">
                {batchBusy ? '批量生成中…' : checked.size > 0 ? `批量生成勾选的 ${checked.size} 篇` : '一键批量生成（未生成的前 5 篇）'}
              </button>
            </div>
          </div>
          <p className="mb-3 text-xs text-light-muted dark:text-dark-muted">
            按 选题总分 60% + 信源多样性 20% + 时效 20% 自动排序。勾选后可批量生成，或单篇快速生成（类型已按标题自动推断）。
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {recs.map((t, i) => (
              <div key={t.cardId} className="flex items-start gap-3 rounded-xl border border-light-border/80 bg-white/60 p-4 dark:border-dark-border/80 dark:bg-white/5">
                <input
                  type="checkbox"
                  className="mt-1 accent-accent"
                  checked={checked.has(t.cardId)}
                  disabled={Boolean(t.articleId)}
                  onChange={() => toggleCheck(t.cardId)}
                  title={t.articleId ? '已生成铸闻' : '勾选加入批量生成'}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-accent dark:text-accent-dark">#{i + 1}</span>
                    <Link href={`/topics/${t.cardId}`} className="truncate font-medium hover:text-accent dark:hover:text-accent-dark">{t.title}</Link>
                  </div>
                  <div className="mb-1.5 flex flex-wrap gap-1.5 text-xs text-light-muted dark:text-dark-muted">
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">总分 {t.totalScore}</span>
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">信源 {t.sourceCount}</span>
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">证据 {t.articleCount}</span>
                    <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent dark:text-accent-dark">{ARTICLE_TYPE_LABELS[t.suggestedType] ?? t.suggestedType}</span>
                    {t.category && <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">{t.category}</span>}
                  </div>
                  {t.recommendationReason && (
                    <p className="line-clamp-2 text-xs leading-relaxed text-light-muted dark:text-dark-muted">{t.recommendationReason}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {t.articleId ? (
                    <Link href={`/generated-articles/${t.articleId}`}
                      className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                      已生成 ›
                    </Link>
                  ) : (
                    <button onClick={() => generateOne(t)} disabled={singleBusy !== null || batchBusy}
                      className="rounded-md border border-accent/60 px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50 dark:border-accent-dark/60 dark:text-accent-dark">
                      {singleBusy === t.cardId ? '生成中…' : '生成'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && recs && recs.length === 0 && (
        <section className="mb-10 rounded-xl border border-light-border/60 p-6 text-center text-sm text-light-muted dark:border-dark-border/60 dark:text-dark-muted">
          还没有可推荐的选题。先运行 <code className="rounded bg-zinc-500/10 px-1">npm run topic-radar</code> 生成选题卡，或点右上「＋ 新建内容」直接创作。
        </section>
      )}

      {/* ── 稿件列表 ─────────────────────────────────── */}
      {!loading && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">稿件列表{articles && articles.length > 0 ? `（${articles.length}）` : ''}</h2>
          {articles && articles.length === 0 && (
            <div className="py-14 text-center text-light-muted dark:text-dark-muted">
              还没有铸闻稿件。可从上方推荐选题一键生成，或点「＋ 新建内容」自由创作。
            </div>
          )}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {articles?.map((a) => {
              const v = VERIFY_META[a.verificationStatus] ?? VERIFY_META.unverified;
              return (
                <Link key={a.id} href={`/generated-articles/${a.id}`} className="group flex flex-col rounded-xl border border-light-border/80 bg-white/60 p-5 shadow-sm transition hover:shadow-md dark:border-dark-border/80 dark:bg-white/5">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent dark:border-accent-dark/30 dark:bg-accent-dark/10 dark:text-accent-dark">铸闻</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${v.cls}`}>{v.label}</span>
                    {a.topicCardId.startsWith('custom-') && (
                      <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-300">自建</span>
                    )}
                    <span className="ml-auto font-display text-xs text-light-muted dark:text-dark-muted">v{a.version}</span>
                  </div>
                  <h3 className="mb-1.5 font-display text-lg font-bold leading-snug group-hover:text-accent dark:group-hover:text-accent-dark">{a.title || '(未命名稿件)'}</h3>
                  <div className="mb-3 flex flex-wrap gap-1.5 text-xs text-light-muted dark:text-dark-muted">
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">{ARTICLE_TYPE_LABELS[a.articleType as keyof typeof ARTICLE_TYPE_LABELS] ?? a.articleType}</span>
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">{STYLE_LABELS[a.style as keyof typeof STYLE_LABELS] ?? a.style}</span>
                    <span className="rounded bg-zinc-500/10 px-1.5 py-0.5">证据 {a.sourceCount}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-light-border/60 pt-3 text-xs text-light-muted dark:border-dark-border/60 dark:text-dark-muted">
                    <span>模型：{a.modelName || '—'}</span>
                    <span>{a.updatedAt ? new Date(a.updatedAt).toLocaleString('zh-CN') : '—'}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {newOpen && (
        <NewArticleDialog
          onClose={() => setNewOpen(false)}
          onGenerated={(id) => { setNewOpen(false); router.push(`/generated-articles/${id}`); }}
        />
      )}

      {marketOpen && (
        <MarketNewsDialog
          onClose={() => setMarketOpen(false)}
          onGenerated={(id) => { setMarketOpen(false); router.push(`/generated-articles/${id}`); }}
        />
      )}
    </div>
  );
}
