// 账户系统 — 注册
// POST { username, password } → 创建用户并直接登录（设置会话 cookie）。
// 账号密码无格式限制（空密码亦可）；仅要求用户名非空且唯一。

import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth/users';
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
    const user = await createUser(username, password);
    const res = NextResponse.json({ ok: true, user });
    res.cookies.set(SESSION_COOKIE, signSessionToken(user.id), sessionCookieOptions());
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : '注册失败';
    // 用户名已存在 / 为空 → 400；数据库问题 → 500
    const status = /已被注册|请填写用户名/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
