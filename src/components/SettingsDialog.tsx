'use client';

// 通用大模型设置 — 前端「设置」窗口
// 用户在此填写 API Key 与大模型参数（provider / BaseURL / 模型 / 温度 / 超时 / max_tokens），
// 保存后「需要 API 的功能」（铸闻生成、观潮选题等）即可使用真实模型。
// 已接入账户系统：配置按登录用户隔离，每人各自保存 Key，互不串用；未登录访问会返回 401。

import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Preset {
  key: string;
  label: string;
  baseUrl: string;
  model: string;
  /** 选填：该厂商需要的特别说明（如模型名格式、网关要求）。 */
  hint?: string;
}

// 国内主流大模型优先排在前面（OpenAI / 自定义置于末尾）。
// 所有厂商均暴露 OpenAI 兼容的 /chat/completions 接口，统一由 openai-compatible 客户端调用。
// 注意：baseUrl 不含末尾的 /chat/completions —— 客户端会自动拼接该路径。
const PRESETS: Preset[] = [
  { key: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  { key: 'kimi', label: 'Kimi（月之暗面）', baseUrl: 'https://api.moonshot.cn/v1', model: 'kimi-k2' },
  { key: 'glm', label: 'GLM（智谱）', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-plus' },
  { key: 'minimax', label: 'MiniMax', baseUrl: 'https://api.minimax.io/v1', model: 'MiniMax-Text-01' },
  {
    key: 'doubao',
    label: '豆包（火山方舟）',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-1.6',
    hint: '模型名通常用火山方舟「推理接入点」ID（ep-xxxx-xxx）；也可填模型族名如 doubao-seed-1.6 / doubao-pro-32k。',
  },
  { key: 'hunyuan', label: '混元（腾讯）', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', model: 'hunyuan-turbo' },
  {
    key: 'qwen',
    label: '通义千问（阿里）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    hint: 'DashScope 兼容模式地址；模型名如 qwen-plus / qwen-max / qwen-turbo / qwen-long / qwen2.5-72b-instruct。',
  },
  { key: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { key: 'custom', label: '自定义（OpenAI 兼容）', baseUrl: '', model: '', hint: '填入任意兼容 /chat/completions 的网关地址即可。' },
];

export default function SettingsDialog({ open, onClose }: Props) {
  const [preset, setPreset] = useState('deepseek');
  const [provider, setProvider] = useState('deepseek');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const [model, setModel] = useState('deepseek-chat');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [timeoutMs, setTimeoutMs] = useState(30000);
  const [maxTokens, setMaxTokens] = useState(2000);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [cfgSource, setCfgSource] = useState<string>('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setLoading(true);
    fetch('/api/settings/llm')
      .then(async (r) => {
        if (r.status === 401) throw new Error('请先登录后再配置大模型。');
        return r.json();
      })
      .then((d) => {
        setApiKeySet(Boolean(d.apiKeySet));
        setApiKeyMasked(d.apiKeyMasked || null);
        setCfgSource(d.source || '');
        if (d.storedProvider) {
          setPreset(d.storedProvider);
          setProvider(d.storedProvider);
        }
        if (d.baseUrl) setBaseUrl(d.baseUrl);
        if (d.model) setModel(d.model);
        if (typeof d.temperature === 'number') setTemperature(d.temperature);
        if (typeof d.timeoutMs === 'number') setTimeoutMs(d.timeoutMs);
        if (typeof d.maxTokens === 'number') setMaxTokens(d.maxTokens);
        // 已保存的密钥不回填到输入框，留空表示「保留当前密钥」
        setApiKey('');
      })
      .catch(() => setMsg({ kind: 'err', text: '读取当前配置失败（可能数据库未连接）。' }))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const applyPreset = (key: string) => {
    setPreset(key);
    setProvider(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p) {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseUrl,
          model,
          apiKey, // 空 → 后端保留原 Key
          temperature,
          timeoutMs,
          maxTokens,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '保存失败');
      setApiKeySet(Boolean(d.apiKeySet));
      setApiKeyMasked(d.apiKeyMasked || null);
      setCfgSource('db');
      setApiKey('');
      setMsg({ kind: 'ok', text: '已保存。需要 API 的功能现在可使用真实大模型。' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch('/api/settings/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, model, apiKey }),
      });
      const d = await res.json();
      if (d.ok) {
        setMsg({ kind: 'ok', text: `连接成功（${d.model} / ${d.provider}）：${(d.sample || '').slice(0, 60)}` });
      } else {
        setMsg({ kind: 'err', text: `连接失败：${d.error || '未知错误'}` });
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  const clearAll = async () => {
    if (!confirm('确定清空已保存的密钥与参数？将回退到环境变量 / 默认（mock）。')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/llm', { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '清空失败');
      setApiKeySet(false);
      setApiKeyMasked(null);
      setCfgSource('none');
      setApiKey('');
      setMsg({ kind: 'info', text: '已清空，回到默认（未配置 → 规则回退）。' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-light-border bg-transparent px-3 py-2 text-sm dark:border-dark-border focus:border-accent focus:outline-none';
  const labelCls = 'section-label mb-1 block';
  const btn =
    'rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-accent-dark';
  const btnGhost =
    'rounded-md border border-light-border px-4 py-2 text-sm font-medium dark:border-dark-border disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-light-border bg-white p-6 shadow-xl dark:border-dark-border dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="section-label mb-0.5 text-accent dark:text-accent-dark">识澜 · 设置</div>
            <h3 className="font-display text-lg font-bold">大模型 API 配置</h3>
          </div>
          <button onClick={onClose} className="text-light-muted hover:text-accent dark:text-dark-muted">✕</button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${apiKeySet ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
            {apiKeySet ? '已配置真实模型' : '未配置（生成将走规则回退）'}
          </span>
          {cfgSource && <span className="text-light-muted dark:text-dark-muted">来源：{cfgSource === 'db' ? '数据库（本窗口保存）' : cfgSource === 'env' ? '环境变量' : '默认'}</span>}
          {apiKeyMasked && <span className="font-mono text-light-muted dark:text-dark-muted">已保存密钥：{apiKeyMasked}</span>}
        </div>

        {loading && <p className="mb-3 text-sm text-light-muted dark:text-dark-muted">读取当前配置…</p>}

        <label className={labelCls}>服务商预设</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.key} onClick={() => applyPreset(p.key)}
              className={`rounded-md border px-3 py-1.5 text-sm ${preset === p.key ? 'border-accent bg-accent/10 text-accent' : 'border-light-border dark:border-dark-border'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <label className={labelCls}>API Key{preset !== 'custom' ? `（${PRESETS.find((p) => p.key === preset)?.label}）` : ''}</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={apiKeySet ? '留空则保留当前已保存密钥' : '粘贴你的 API Key（如 sk-...）'}
          className={`${inputCls} mb-3`}
          autoComplete="off"
        />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Base URL</label>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.xxx/v1" className={`${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>模型名</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="如 deepseek-chat / gpt-4o-mini" className={`${inputCls}`} />
            {PRESETS.find((p) => p.key === preset)?.hint && (
              <p className="mt-1 text-xs leading-relaxed text-light-muted dark:text-dark-muted">
                {PRESETS.find((p) => p.key === preset)?.hint}
              </p>
            )}
          </div>
        </div>

        <label className={labelCls}>温度（Temperature）：{temperature.toFixed(2)}</label>
        <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))}
          className="mb-3 w-full accent-accent" />

        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>超时（毫秒）</label>
            <input type="number" min={1000} step={1000} value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} className={`${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>最大 Token（可选）</label>
            <input type="number" min={0} step={256} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} className={`${inputCls}`} />
          </div>
        </div>

        {msg && (
          <p className={`mb-3 text-sm ${msg.kind === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : msg.kind === 'err' ? 'text-red-500' : 'text-light-muted dark:text-dark-muted'}`}>
            {msg.text}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={saving || testing} className={btn}>{saving ? '保存中…' : '保存配置'}</button>
          <button onClick={testConnection} disabled={saving || testing} className={btnGhost}>{testing ? '测试中…' : '测试连接'}</button>
          {apiKeySet && (
            <button onClick={clearAll} disabled={saving || testing} className="ml-auto text-xs text-light-muted underline hover:text-red-500 dark:text-dark-muted">清空</button>
          )}
        </div>

        <p className="mt-3 text-xs leading-relaxed text-light-muted dark:text-dark-muted">
          配置仅保存在本系统数据库。当前为<strong>全局配置</strong>；未来接入用户系统后，将按登录用户隔离各自的密钥，<strong>互不串用</strong>。未填写时，相关功能在「无 Key」下走规则回退（不调用模型），发布前均须人工审核。
        </p>
      </div>
    </div>
  );
}
