// 识澜·账户系统 — 请求级当前用户解析 + cookie 助手（依赖 next/headers）
// ---------------------------------------------------------------------------
// 该模块只在「请求上下文」（路由处理器 / 服务端组件）中使用。它读取会话 cookie，
// 校验签名令牌，得出当前登录用户 ID。任何异常（非请求上下文、无 cookie、令牌
// 失效）都安全回退到 GLOBAL_USER_ID（= 未登录 / 全局），绝不抛错。
//
// 关键：getRequestUserId() 为同步函数（令牌自校验、无需查库），因此可无缝作为
// LLM 解析管线的默认 userId，全站自动按登录用户隔离各自的大模型 Key。

import { cookies } from 'next/headers';
import { GLOBAL_USER_ID } from '../llm/settings';
import { SESSION_COOKIE, SESSION_TTL_MS, verifySessionToken } from './token';

/** 读取当前请求的登录用户 ID；未登录或异常时返回 GLOBAL_USER_ID。 */
export function getRequestUserId(): string {
  try {
    const token = cookies().get(SESSION_COOKIE)?.value;
    const parsed = verifySessionToken(token);
    return parsed ? parsed.userId : GLOBAL_USER_ID;
  } catch {
    return GLOBAL_USER_ID;
  }
}

/** 是否已登录（当前请求存在有效会话）。 */
export function isLoggedIn(): boolean {
  return getRequestUserId() !== GLOBAL_USER_ID;
}

/** 会话 cookie 的标准写入选项（httpOnly，防 XSS 读取）。 */
export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/** 清除会话 cookie 的选项（maxAge=0 立即失效）。 */
export function clearCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}
