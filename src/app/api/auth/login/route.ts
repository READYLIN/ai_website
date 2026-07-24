// 账户系统 — 登录
// POST { username, password } → 校验凭据，成功则设置会话 cookie。
// 失败统一返回 401「用户名或密码错误」（不区分用户名是否存在，防枚举）。

import { NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth/users';
import { signSessionToken, SESSION_COOKIE } from '@/lib/auth/token';
import { sessionCookieOptions } from '@/lib/auth/request-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';

  try {
    const user = await verifyCredentials(username, password);
    if (!user) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, signSessionToken(user.id), sessionCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
