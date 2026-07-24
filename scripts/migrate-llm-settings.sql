-- 识澜·智稿 — LLM 设置表
-- 用于在前端「设置」窗口中保存用户配置的大模型参数（API Key / BaseURL / 模型 / 温度等）。
-- 本表 intentionally 按 user_id 隔离：当前无用户系统，统一存为 '__global__'；
-- 未来接入用户系统后，每个用户各自一行，天然避免「A 用户的 Key 被 B 用户使用」。
-- 可重复执行（IF NOT EXISTS），不修改/删除现有数据。

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
