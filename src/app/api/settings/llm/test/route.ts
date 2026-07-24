// 通用 LLM 设置 — 连接测试
// POST：用「提交值优先、缺 Key 时回退到已保存配置」做一次最小 chat completion，
// 验证 Key / BaseURL / 模型是否可用。始终返回 200（ok:true / ok:false + error），
// 便于前端直接读取，不触发网络错误态。

import { NextResponse } from 'next/server';
import { createOpenAICompatibleProvider } from '@/lib/llm/client';
import { resolveLLMConfig, GLOBAL_USER_ID } from '@/lib/llm/settings';
import { getRequestUserId } from '@/lib/auth/request-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = getRequestUserId();
  if (userId === GLOBAL_USER_ID) {
    return NextResponse.json({ ok: false, error: '请先登录后再测试连接' }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // 允许空 body：纯测试已保存配置
  }

  const saved = await resolveLLMConfig(userId);
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;

  const apiKey = str(body.apiKey) ?? saved.apiKey;
  const baseUrl = str(body.baseUrl) ?? (saved.baseUrl || 'https://api.openai.com/v1');
  const model = str(body.model) ?? saved.model;

  if (!apiKey || !model) {
    return NextResponse.json(
      { ok: false, error: '缺少 API Key 或模型名，无法测试连接。请先填写后再试。' },
      { status: 200 },
    );
  }

  const provider = createOpenAICompatibleProvider({ apiKey, baseUrl, model, timeoutMs: 15000 });
  try {
    const res = await provider.complete(
      [{ role: 'user', content: '用一句话确认连接正常。' }],
      { maxTokens: 16 },
    );
    return NextResponse.json({
      ok: true,
      model: res.model,
      provider: res.provider,
      sample: (res.content || '').slice(0, 120),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '连接失败';
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
