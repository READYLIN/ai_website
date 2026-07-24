// 通用 LLM 抽象层 — Provider 工厂
// 配置来源（优先级）：
//   1. 数据库 llm_settings 中「当前用户」的行（前端「设置」窗口保存的 Key/参数）
//   2. 环境变量 LLM_API_KEY / LLM_BASE_URL / LLM_MODEL（部署侧兜底，尤其 LLM_PROVIDER=mock 无 Key 也能跑）
// 无有效配置时回退到 mock provider（保证“无 Key 也能跑”，不静默伪造真实内容）。
//
// 按用户隔离：解析以 userId 为维度。缺省 userId 由 getRequestUserId() 从会话 cookie
// 读取当前登录用户 —— 已登录用户使用各自保存的 Key；未登录 / 非请求上下文回退到
// '__global__'（走全局配置或环境变量）。由此实现「配置跟人走、互不串用 Key」。

import { createOpenAICompatibleProvider } from './client';
import { createMockProvider } from './mock-provider';
import { resolveLLMConfig } from './settings';
import { getRequestUserId } from '../auth/request-user';
import type { LLMProvider } from './types';

// 注：当前所有厂商（含国内大模型）均经 openai-compatible 客户端调用；
// 此枚举仅作文档/类型用途，路由不依赖它（始终为 'openai-compatible' 或 'mock'）。
export type LLMProviderName =
  | 'mock'
  | 'openai'
  | 'openai-compatible'
  | 'deepseek'
  | 'kimi'
  | 'glm'
  | 'minimax'
  | 'doubao'
  | 'hunyuan'
  | 'qwen';

/**
 * 获取 LLM provider。
 * - 已配置真实 Key → 返回 openai-compatible provider（使用 DB/环境变量中的 baseUrl/key/model/参数）。
 * - 未配置 → 返回 mock provider（规则生成，便于无 Key 调试与测试）。
 * @param userId 当前用户 ID（缺省时取 getRequestUserId()，即当前登录用户）。
 */
export async function getLLMProvider(userId?: string): Promise<LLMProvider> {
  const cfg = await resolveLLMConfig(userId ?? getRequestUserId());
  if (!cfg.configured) {
    return createMockProvider();
  }
  return createOpenAICompatibleProvider({
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    timeoutMs: cfg.timeoutMs,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
  });
}

/** 是否已具备调用真实模型的配置（有 Key 且有模型名）。 */
export async function isLLMConfigured(userId?: string): Promise<boolean> {
  return (await resolveLLMConfig(userId ?? getRequestUserId())).configured;
}
