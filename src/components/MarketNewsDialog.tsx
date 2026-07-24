'use client';

// 铸闻 · 生成大盘综述：一键获取全市场数据（指数 + 涨跌家数）→ 生成财经新闻。
// 数据来自免费源（新浪财经指数 / 东方财富涨跌家数，无需 Key），下载后作为"库外证据"喂给铸闻管线，
// 复用 Fact Sheet → 生成 → 逐句核查 → 编辑器 全流程，证据面板可见来源。

import { useState } from 'react';
import { STYLE_LABELS } from '@/lib/article-generator/config';
import type { ArticleStyle } from '@/lib/article-generator/types';

const STYLES: ArticleStyle[] = ['objective', 'financial_media', 'guangzhou_local', 'investment_brief'];
const LENGTHS = [300, 600, 1000];

interface IndexView {
  code: string;
  name: string;
  current: number;
  change: number;
  changePct: number;
}
interface BreadthView {
  up: number;
  down: number;
  flat: number;
  total: number;
  available: boolean;
  note?: string;
}
interface Preview {
  date: string;
  time: string;
  topic: string;
  indices: IndexView[];
  breadth: BreadthView;
}

interface Props {
  onClose: () => void;
  onGenerated: (articleId: string) => void;
}

const pctCls = (p: number) =>
  p > 0 ? 'text-rose-500' : p < 0 ? 'text-emerald-500' : 'text-zinc-500';

export default function MarketNewsDialog({ onClose, onGenerated }: Props) {
  const [style, setStyle] = useState<ArticleStyle>('financial_media');
  const [targetLength, setTargetLength] = useState(600);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setErr('');
    try {
      const res = await fetch('/api/generated-articles/market-overview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取大盘数据失败');
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPreview(false);
    }
  };

  const submit = async () => {
    if (!preview) {
      setErr('请先获取大盘数据');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/generated-articles/market-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style, targetLength }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      onGenerated(data.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-light-border bg-white p-6 shadow-xl dark:border-dark-border dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="section-label mb-0.5 text-accent dark:text-accent-dark">识澜 · 铸闻</div>
            <h3 className="font-display text-lg font-bold">生成大盘综述</h3>
          </div>
          <button onClick={onClose} className="text-light-muted hover:text-accent dark:text-dark-muted">✕</button>
        </div>

        <p className="mb-3 text-xs leading-relaxed text-light-muted dark:text-dark-muted">
          一键获取全市场数据（主要指数 + 全市场涨跌家数），自动生成一篇概括整个股市的综述稿。数据来自免费源（新浪财经 / 东方财富，无需 Key）。
        </p>

        <button onClick={fetchPreview} disabled={loadingPreview}
          className="mb-3 w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent-dark">
          {loadingPreview ? '获取中…' : '获取大盘数据'}
        </button>

        {preview && (
          <div className="mb-4 rounded-xl border border-light-border/70 bg-zinc-500/5 p-4 dark:border-dark-border/70">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-base font-bold">{preview.topic}</span>
              <span className="text-xs text-light-muted dark:text-dark-muted">{preview.date} {preview.time}</span>
            </div>
            <div className="overflow-hidden rounded-lg border border-light-border/60 dark:border-dark-border/60">
              <table className="w-full text-sm">
                <thead className="bg-zinc-500/10 text-xs text-light-muted dark:text-dark-muted">
                  <tr>
                    <th className="px-3 py-1.5 text-left">指数</th>
                    <th className="px-3 py-1.5 text-right">收盘/点位</th>
                    <th className="px-3 py-1.5 text-right">涨跌点</th>
                    <th className="px-3 py-1.5 text-right">涨跌幅</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.indices.map((x) => (
                    <tr key={x.code} className="border-t border-light-border/50 dark:border-dark-border/50">
                      <td className="px-3 py-1.5">{x.name}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{x.current.toLocaleString('zh-CN')}</td>
                      <td className={`px-3 py-1.5 text-right ${pctCls(x.change)}`}>{x.change >= 0 ? '+' : ''}{x.change.toLocaleString('zh-CN')}</td>
                      <td className={`px-3 py-1.5 text-right ${pctCls(x.changePct)}`}>{x.changePct >= 0 ? '+' : ''}{x.changePct.toFixed(2)}%</td>
                    </tr>
                  ))}
                  {preview.indices.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-2 text-center text-xs text-light-muted dark:text-dark-muted">指数数据获取失败</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 rounded-lg bg-zinc-500/5 px-3 py-2 text-sm">
              {preview.breadth.available ? (
                <span>
                  全市场 <span className="font-medium">上涨 {preview.breadth.up}</span> 家 ·
                  <span className="font-medium text-emerald-600 dark:text-emerald-400"> 下跌 {preview.breadth.down}</span> 家 ·
                  平盘 {preview.breadth.flat} 家（共 {preview.breadth.total} 家）
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-300">涨跌家数：{preview.breadth.note}</span>
              )}
            </div>
          </div>
        )}

        {preview && (
          <>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="section-label mb-1 block">写作风格</label>
                <select value={style} onChange={(e) => setStyle(e.target.value as ArticleStyle)}
                  className="w-full rounded-md border border-light-border bg-transparent px-3 py-2 text-sm dark:border-dark-border">
                  {STYLES.map((s) => <option key={s} value={s}>{STYLE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-1 block">稿件长度</label>
                <div className="flex gap-2">
                  {LENGTHS.map((n) => (
                    <button key={n} onClick={() => setTargetLength(n)}
                      className={`flex-1 rounded-md border px-2 py-2 text-sm ${targetLength === n ? 'border-accent bg-accent/10 text-accent' : 'border-light-border dark:border-dark-border'}`}>
                      {n} 字
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="mb-2 text-xs text-light-muted dark:text-dark-muted">稿件类型固定为「大盘综述」（market_overview）。</p>
          </>
        )}

        {err && <p className="mb-3 text-sm text-red-500">{err}</p>}

        <button onClick={submit} disabled={busy || !preview}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent-dark">
          {busy ? '生成中…（约 10-30 秒）' : preview ? '生成大盘综述' : '请先获取大盘数据'}
        </button>
        <p className="mt-2 text-xs text-light-muted dark:text-dark-muted">
          数据来自免费源（新浪财经指数 / 东方财富涨跌家数，无需 Key）。生成消耗模型调用（未配 Key 走规则回退，发布前须人工审核）。涨跌家数取数受限时，稿件将标注「暂不可用」并以交易所官方数据为准。
        </p>
      </div>
    </div>
  );
}
