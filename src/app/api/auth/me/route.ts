// 账户系统 — 当前登录用户
// GET → { user: { id, username } | null }。前端据此渲染登录态与「大模型配置」入口。

import { NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/auth/request-user';
import { findUserById } from '@/lib/auth/users';
import { GLOBAL_USER_ID } from '@/lib/llm/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = getRequestUserId();
  if (userId === GLOBAL_USER_ID) {
    return NextResponse.json({ user: null });
  }
  const user = await findUserById(userId);
  return NextResponse.json({ user: user ?? null });
}
