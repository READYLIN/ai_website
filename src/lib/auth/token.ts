// 识澜·账户系统 — 无状态会话令牌（纯函数，仅依赖 Node 内置 crypto）
// ---------------------------------------------------------------------------
// 采用「签名 cookie」而非 sessions 表：令牌自带 userId 与过期时间，用服务端密钥
// 做 HMAC-SHA256 签名。优点：
//   * 校验无需查库 → getCurrentUserId() 可保持同步，天然接入现有 LLM 解析管线，
//     全站（设置页 + 生成流程）自动按登录用户隔离 Key，零改造扩散。
//   * 退出登录 = 清除 cookie；令牌自带过期，简单可靠。
//
// 令牌格式：base64url(payloadJson) + "." + base64url(hmac)
//   payloadJson = {"u":"<userId>","e":<expiresAtMs>}
//
// 密钥来源：环境变量 AUTH_SECRET（生产务必设置）；缺省用开发用弱密钥并告警。

import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE = 'shilan_sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

let warned = false;
function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.trim()) return s.trim();
  if (!warned) {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn('[auth] AUTH_SECRET 未设置，使用开发用弱密钥。生产环境请在 .env.local 配置 AUTH_SECRET。');
  }
  return 'shilan-dev-insecure-secret-change-me';
}

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payloadB64: string): string {
  return b64urlEncode(createHmac('sha256', getSecret()).update(payloadB64).digest());
}

/** 生成签名会话令牌。expiresAtMs 缺省为 now + SESSION_TTL_MS。 */
export function signSessionToken(userId: string, expiresAtMs?: number): string {
  const exp = expiresAtMs ?? Date.now() + SESSION_TTL_MS;
  const payloadB64 = b64urlEncode(JSON.stringify({ u: userId, e: exp }));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** 校验令牌：签名正确且未过期时返回 { userId, expiresAt }，否则 null（不抛错）。 */
export function verifySessionToken(token: string | null | undefined): { userId: string; expiresAt: number } | null {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expectedSig = sign(payloadB64);
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as { u?: unknown; e?: unknown };
    const userId = typeof payload.u === 'string' ? payload.u : '';
    const expiresAt = typeof payload.e === 'number' ? payload.e : 0;
    if (!userId || !expiresAt || Date.now() >= expiresAt) return null;
    return { userId, expiresAt };
  } catch {
    return null;
  }
}
