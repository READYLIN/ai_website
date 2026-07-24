// 识澜·铸闻 — 大盘行情数据源：HTTP 工具（GBK 文本 / UTF-8 JSON）
// 复用「超时 + 重试 + 浏览器 UA/Referer」的稳健模式（与 mita-search 一致）。

import iconv from 'iconv-lite';

interface FetchOpts {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

async function getBuffer(url: string, opts: FetchOpts = {}): Promise<Buffer> {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const retries = opts.retries ?? 2;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: '*/*',
          ...(opts.headers || {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw new Error(`行情请求失败（${url}）：${String(lastErr)}`);
}

/** 取 GBK 文本（新浪行情用）。 */
export async function fetchGbkText(url: string, opts?: FetchOpts): Promise<string> {
  const buf = await getBuffer(url, opts);
  return iconv.decode(buf, 'gbk');
}

/** 取 UTF-8 JSON（东方财富等）。 */
export async function fetchJson<T = any>(url: string, opts?: FetchOpts): Promise<T> {
  const buf = await getBuffer(url, {
    ...opts,
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://quote.eastmoney.com/',
      ...(opts?.headers || {}),
    },
  });
  return JSON.parse(buf.toString('utf8')) as T;
}
