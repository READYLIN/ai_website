-- 识澜·账户系统 — users 表
-- 简单账户：用户名（唯一、任意字符、无格式限制）+ 密码哈希（scrypt，盐随机，存为 salt:hash）。
-- 账户系统用于让「大模型配置」按用户隔离：每个用户保存各自的 API Key，互不串用。
-- 会话采用无状态签名 cookie（见 src/lib/auth/token.ts），故此处无需 sessions 表。
-- 可重复执行（IF NOT EXISTS），不修改/删除现有数据。

CREATE TABLE IF NOT EXISTS `users` (
  `id`           VARCHAR(64)  NOT NULL,
  `username`     VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(512) NOT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
