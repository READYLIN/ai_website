'use client';

// 账户系统 — 登录 / 注册弹窗
// 账号密码「无格式限制」：不做任何长度/复杂度前端校验（按产品要求）。
// 成功后设置 httpOnly 会话 cookie，回调 onSuccess 通知外层刷新登录态。

import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; username: string }) => void;
  /** 初始模式：登录或注册。 */
  initialMode?: 'login' | 'register';
}

export default function AuthDialog({ open, onClose, onSuccess, initialMode = 'login' }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || (mode === 'login' ? '登录失败' : '注册失败'));
      setUsername('');
      setPassword('');
      onSuccess(d.user);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-light-border bg-transparent px-3 py-2 text-sm dark:border-dark-border focus:border-accent focus:outline-none';
  const labelCls = 'section-label mb-1 block';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-light-border bg-white p-6 shadow-xl dark:border-dark-border dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="section-label mb-0.5 text-accent dark:text-accent-dark">识澜 · 账户</div>
            <h3 className="font-display text-lg font-bold">{mode === 'login' ? '登录' : '注册'}</h3>
          </div>
          <button onClick={onClose} className="text-light-muted hover:text-accent dark:text-dark-muted" aria-label="关闭">✕</button>
        </div>

        <div className="mb-4 flex rounded-lg border border-light-border p-0.5 text-sm dark:border-dark-border">
          <button
            type="button"
            onClick={() => { setMode('login'); setErr(null); }}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'login' ? 'bg-accent text-white' : 'text-light-muted dark:text-dark-muted'}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErr(null); }}
            className={`flex-1 rounded-md py-1.5 transition-colors ${mode === 'register' ? 'bg-accent text-white' : 'text-light-muted dark:text-dark-muted'}`}
          >
            注册
          </button>
        </div>

        <form onSubmit={submit}>
          <label className={labelCls}>用户名</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="任意用户名"
            className={`${inputCls} mb-3`}
            autoComplete="username"
            autoFocus
          />
          <label className={labelCls}>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="任意密码（无格式限制）"
            className={`${inputCls} mb-1`}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <p className="mb-3 text-xs text-light-muted dark:text-dark-muted">账号与密码无长度/复杂度限制；密码经哈希后安全存储，绝不明文保存。</p>

          {err && <p className="mb-3 text-sm text-red-500">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent-dark"
          >
            {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-light-muted dark:text-dark-muted">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(null); }}
            className="ml-1 text-accent underline dark:text-accent-dark"
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
