# 大模型 API 设置模块（前端「设置」窗口）

> 让「需要 API Key 的功能」（铸闻生成、观潮选题等）可以由用户在前端「设置」窗口自行填写
> Key 与模型参数，保存后即可使用，并为「按用户隔离」做好了架构准备。

## 1. 背景与需求

- 之前大模型配置只能写在**部署环境变量**（`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`），
  普通用户无法自助配置，也无法为不同功能切换模型。
- 用户要求：提供**前端设置窗口**，让用户**输入密钥 → 配置大模型参数 → 即可使用**。
- 用户要求（未来向）：**如果以后有用户系统，要按用户区分**，避免一个用户的 API 被另一个用户使用。

## 2. 设计要点

### 2.1 存储：`llm_settings` 表（按用户隔离）
```sql
CREATE TABLE IF NOT EXISTS `llm_settings` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id`     VARCHAR(255) NOT NULL DEFAULT '__global__',
  `provider`    VARCHAR(64)  NOT NULL DEFAULT 'openai-compatible',
  `base_url`    VARCHAR(512) NULL,
  `model`       VARCHAR(255) NULL,
  `api_key`     VARCHAR(1024) NULL,
  `temperature` DECIMAL(3,2) NULL,
  `timeout_ms`  INT UNSIGNED NULL,
  `max_tokens`  INT UNSIGNED NULL,
  `updated_at`  DATETIME     NOT NULL,
  UNIQUE KEY `uniq_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
- `user_id` 为**唯一隔离维度**：当前无用户系统 → 统一写入 `__global__` 这一行；
  未来接入用户系统后，每个用户各占一行，**天然避免串用 Key**。

### 2.2 解析优先级（DB 优先，env 兜底）
`resolveLLMConfig(userId)`：
1. 读取 `llm_settings` 中该 `userId` 的行；
2. 缺失字段回退到环境变量（`LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` / `LLM_TIMEOUT_MS`）；
3. 两者皆无 → `configured=false` → `getLLMProvider()` 回退到 **mock provider**（规则生成，不调用真实模型、不伪造）。
- 带**每用户短缓存（60s）**，降低库压力。

### 2.3 按用户隔离的唯一接缝
全代码唯一需要改动以接入真实用户系统的地方是 `src/lib/llm/settings.ts` 的：
```ts
export function getCurrentUserId(): string {
  return GLOBAL_USER_ID; // TODO(用户系统)：改为从会话/cookie 读取登录用户 ID
}
```
只要这里返回正确的 `userId`，下方所有解析、缓存、读写（`getLLMSettingsRow` / `upsertLLMSettings` /
`deleteLLMSettings` / `resolveLLMConfig`）都会自动按用户隔离。无需改动任何业务调用点。

## 3. API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/settings/llm` | 返回当前用户配置（Key 仅掩码 `sk-…1234`，绝不明文） |
| POST | `/api/settings/llm` | 保存/更新；`apiKey` 留空则保留原 Key |
| DELETE | `/api/settings/llm` | 清空，回到环境变量 / 默认 |
| POST | `/api/settings/llm/test` | 用提交值（或已保存 Key）做最小 chat completion 验证连接 |

详见《铸闻 — API 接口文档》§15。

## 4. 前端

- `Header` 顶栏新增齿轮按钮 ⚙，点击打开 `SettingsDialog`。
- `SettingsDialog`：服务商预设（**国内大模型优先**）、API Key（password，
  已保存时显示掩码并提示「留空保留当前密钥」）、Base URL、模型名、温度滑块、超时、max_tokens；
  提供「保存配置」「测试连接」「清空」。
- 打开时 GET 回填；保存后 POST；可一键测试连接（不发真实长文，仅最小调用）。

### 4.1 服务商预设（OpenAI 兼容接口）

所有厂商均暴露 OpenAI 兼容的 `/chat/completions` 端点，统一由 `openai-compatible` 客户端调用。
预设仅用于一键填好 Base URL 与默认模型名（用户可随时手改模型名）：

| 预设 | 服务商 | Base URL | 默认模型 | 备注 |
|---|---|---|---|---|
| `deepseek` | DeepSeek | `https://api.deepseek.com` | `deepseek-chat` | 注意：base_url 为根域名，不带 `/v1` |
| `kimi` | Kimi（月之暗面） | `https://api.moonshot.cn/v1` | `kimi-k2` | 也可填 `moonshot-v1-8k/32k/128k` |
| `glm` | GLM（智谱） | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-plus` | 也可 `glm-4-air/flash/long` |
| `minimax` | MiniMax | `https://api.minimax.io/v1` | `MiniMax-Text-01` | Platform API 兼容模式 |
| `doubao` | 豆包（火山方舟） | `https://ark.cn-beijing.volces.com/api/v3` | `doubao-seed-1.6` | 模型名常用接入点 ID（`ep-xxxx`） |
| `hunyuan` | 混元（腾讯） | `https://api.hunyuan.cloud.tencent.com/v1` | `hunyuan-turbo` | 也可 `hunyuan-pro/standard/lite` |
| `qwen` | 通义千问（阿里） | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` | 也可 `qwen-max/turbo/long` |
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` | |
| `custom` | 自定义 | 用户自填 | 用户自填 | 任意兼容 `/chat/completions` 的网关 |

> 说明：客户端在 `baseUrl` 后自动拼接 `/chat/completions`；因此各预设的 `baseUrl` 都已去掉该后缀
> （例如 DeepSeek 为根域名 `https://api.deepseek.com`，而非 `https://api.deepseek.com/v1`）。

## 5. 安全说明

- **传输/存储**：Key 存于数据库 `llm_settings.api_key`；所有读取接口（GET）**只返回掩码**，不返回明文。
- **隔离**：按 `user_id` 隔离，未来用户系统接入后互不串用（见 §2.3）。
- **加密增强（可选后续）**：当前 Key 以明文存库。如需更强保障，可接入 AES 加密（`crypto` + 服务端密钥
  `LLM_SETTINGS_SECRET`），解密仅在 `resolveLLMConfig` 时内存中进行；此为可选加固项，不影响现有隔离能力。
- **无 Key 行为**：未配置时生成走规则回退（mock），不会伪造真实模型内容，发布前仍须人工审核。

## 6. 迁移与测试

- 迁移：`npm run migrate:llm-settings`（幂等建表）。
- 测试：`npm run test:llm-settings`
  - 纯函数单测：`maskApiKey`（掩码规则）、`mergeConfigSources`（env-only / DB 覆盖 env / 无配置→mock / DB 有 model 无 key 回退 env）。
  - 可选联网集成：`LLM_SETTINGS_LIVE=1` 时执行 upsert → 回读 → 清空（验证 DECIMAL 温度、apiKey 空保留等）。

## 7. 关键文件

- `src/lib/llm/settings.ts` —— 解析 / 隔离 / 掩码 / 读写（核心）。
- `src/lib/llm/provider.ts` —— `getLLMProvider()` / `isLLMConfigured()` 改为 async，经 settings 解析。
- `src/lib/llm/client.ts` —— OpenAI 兼容客户端支持 provider 级 `temperature` / `maxTokens` 默认。
- `src/app/api/settings/llm/route.ts` + `test/route.ts` —— 设置 API。
- `src/components/SettingsDialog.tsx` + `Header.tsx` —— 前端窗口与入口。
- `scripts/migrate-llm-settings.sql` / `.mjs`、`scripts/test-llm-settings.cjs`。
