-- 识澜·智稿 — 一键财经新闻生成 数据库迁移
-- 幂等：全部 CREATE TABLE IF NOT EXISTS；重复执行不报错。
-- 不新增第二套数据库连接（复用 ai_web 库，与现有 topic_radar 同库）。
-- 不创建外键（贴合现有项目风格：topic_*/articles/intelligence 均用 varchar 主键，应用层关联）。
-- 不复制整篇原始新闻（证据关联仅存 news_id 引用）。

CREATE TABLE IF NOT EXISTS `generated_articles` (
  `id`                   VARCHAR(255)   NOT NULL,
  `topic_card_id`        VARCHAR(255)   NOT NULL,
  `topic_id`             VARCHAR(255)   NOT NULL,
  `article_type`         VARCHAR(40)    NOT NULL,
  `style`                VARCHAR(40)    NOT NULL,
  `target_length`        INT            NOT NULL DEFAULT 600,
  `title`                VARCHAR(500)   NOT NULL DEFAULT '',
  `alternative_titles`   JSON,
  `lead_text`            MEDIUMTEXT,
  `body_text`            MEDIUMTEXT,
  `sections_json`        JSON,
  `fact_sheet_json`      JSON,
  `unverified_items_json` JSON,
  `risk_notes_json`      JSON,
  `source_ids_json`      JSON,
  `verification_status`  VARCHAR(20)    NOT NULL DEFAULT 'unverified',
  `model_name`           VARCHAR(120),
  `prompt_version`       VARCHAR(20),
  `status`               VARCHAR(20)    NOT NULL DEFAULT 'draft',
  `version`              INT            NOT NULL DEFAULT 1,
  `is_latest`            TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`           DATETIME,
  `updated_at`           DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_ga_topic_card` (`topic_card_id`),
  KEY `idx_ga_topic` (`topic_id`),
  KEY `idx_ga_is_latest` (`is_latest`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `generated_article_evidence` (
  `id`                    VARCHAR(255)   NOT NULL,
  `generated_article_id`  VARCHAR(255)   NOT NULL,
  `news_id`               VARCHAR(255)   NOT NULL,
  `evidence_type`         VARCHAR(40),
  `evidence_order`        INT            NOT NULL DEFAULT 0,
  `created_at`            DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_gae_article` (`generated_article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `article_fact_checks` (
  `id`                    VARCHAR(255)   NOT NULL,
  `generated_article_id`  VARCHAR(255)   NOT NULL,
  `sentence_index`        INT            NOT NULL DEFAULT 0,
  `sentence_text`         MEDIUMTEXT,
  `support_status`        VARCHAR(20)    NOT NULL DEFAULT 'unsupported',
  `supporting_news_ids_json` JSON,
  `explanation`           MEDIUMTEXT,
  `confidence_score`      TINYINT,
  `created_at`            DATETIME,
  PRIMARY KEY (`id`),
  KEY `idx_afc_article` (`generated_article_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2026-07-23 的「用户手填证据」需要给 generated_article_evidence 增加冗余列
-- （title/source/url/published_at/summary/is_inline），供编辑器回读手填证据内容。
-- 该 ALTER 的幂等逻辑放在 migrate-article-generator.mjs 中（按 information_schema 判断后执行），
-- 不放这里，以避免不同 MySQL 客户端对 ADD COLUMN IF NOT EXISTS 的兼容差异。
