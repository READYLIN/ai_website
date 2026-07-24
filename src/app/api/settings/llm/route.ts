// 通用 LLM 设置 — API
// GET  ：返回当前用户的配置（Key 仅以掩码形式返回，绝不暴露明文）
// POST ：保存/更新当前用户的配置；apiKey 留空则保留原 Key
// DELETE：清空当前用户的配置（回到环境变量 / 默认）
//
// 隔离：所有读写都按当前登录用户（getRequestUserId）限定，互不串用 Key。
// 未登录（GLOBAL_USER_ID）时统一返回 401 —— 大模型配置必须登录后使用。

import { NextResponse } from 'next/server';
import {
  resolveLLMConfig,
  maskApiKey,
  GLOBAL_USER_ID,
  getLLMSettingsRow,
  upsertLLMSettings,
  deleteLLMSettings,
  type LLMSettingsInput,
} from '@/lib/llm/settings';
import { getRequestUserId } from '@/lib/auth/request-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 取当前登录用户 ID；未登录返回 null（调用方据此返回 401）。 */
function requireUserId(): string | null {
  const uid = getRequestUserId();
  return uid === GLOBAL_USER_ID ? null : uid;
}

const UNAUTHORIZED = () => NextResponse.json({ error: '请先登录后再配置大模型' }, { status: 401 });

export async function GET() {
  const userId = requireUserId();
  if (!userId) return UNAUTHORIZED();
  const cfg = await resolveLLMConfig(userId);
  const row = await getLLMSettingsRow(userId);
  return NextResponse.json({
    configured: cfg.configured,
    source: cfg.source,
    provider: cfg.provider,
    storedProvider: row?.provider ?? null,
    model: cfg.model || null,
    baseUrl: cfg.baseUrl || null,
    temperature: cfg.temperature ?? null,
    timeoutMs: cfg.timeoutMs ?? null,
    maxTokens: cfg.maxTokens ?? null,
    apiKeySet: cfg.apiKeySet,
    apiKeyMasked: maskApiKey(cfg.apiKey),
  });
}

export async function POST(req: Request) {
  const userId = requireUserId();
  if (!userId) return UNAUTHORIZED();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;

  const input: LLMSettingsInput = {
    provider: str(body.provider),
    baseUrl: str(body.baseUrl),
    model: str(body.model),
    apiKey: str(body.apiKey),
    temperature: num(body.temperature),
    timeoutMs: num(body.timeoutMs),
    maxTokens: num(body.maxTokens),
  };

  try {
    const row = await upsertLLMSettings(input, userId);
    return NextResponse.json({
      ok: true,
      configured: Boolean(row.apiKey && row.model),
      source: 'db' as const,
      provider: row.provider,
      model: row.model,
      baseUrl: row.baseUrl,
      temperature: row.temperature,
      timeoutMs: row.timeoutMs,
      maxTokens: row.maxTokens,
      apiKeySet: Boolean(row.apiKey),
      apiKeyMasked: maskApiKey(row.apiKey),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const userId = requireUserId();
  if (!userId) return UNAUTHORIZED();
  try {
    await deleteLLMSettings(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '清空失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
