// 账户系统 — 退出登录
// POST → 清除会话 cookie。

import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/token';
import { clearCookieOptions } from '@/lib/auth/request-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', clearCookieOptions());
  return res;
}
