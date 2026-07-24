-- 识澜·观潮 (Topic Radar) — Phase 1 数据库迁移
-- ───────────────────────────────────────────────────────────
-- 设计原则（贴合现有项目）：
--   1. 主键沿用现有规范：全部使用 varchar(255) 兼容字符串主键，
--      NOT 照搬原计划里的 BIGINT（现有 articles/intelligence 主键是 varchar(255)，
--      若用 BIGINT 会导致 topic_articles.news_id 类型不匹配）。
--   2. 不创建外键（FOREIGN KEY）。现有项目所有表均不使用外键，
--      新增表保持一致，关联靠应用层维护，避免破坏现有数据模型。
--   3. 可重复执行：全部使用 CREATE TABLE IF NOT EXISTS；
--      后续若需加列，请使用“先检查 information_schema 再 ALTER”的幂等写法。
--   4. JSON 列：当前 MySQL 为 8.4，原生支持 JSON，无需特殊版本判断。
--   5. 不修改、不删除任何现有表。
--
-- 运行方式（二选一）：
--   A. mysql -uroot -p < scripts/migrate-topic-radar.sql
--   B. node scripts/migrate-topic-radar.mjs   （读取 .env.local 的 MYSQL_* 配置）

CREATE DATABASE IF NOT EXISTS `ai_web` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `ai_web`;

-- 1) 话题聚类表
--    id / topic_key 均为 varchar(64)，topic_key 为“实体+事件类型+时间窗口”的
--    稳定哈希，用于跨次运行去重（见 src/lib/topic-radar/topic-key.ts）。
CREATE TABLE IF NOT EXISTS `topic_clusters` (
  `id`                    varchar(64)  NOT NULL,
  `topic_key`             varchar(64)  NOT NULL,
  `topic_name`            varchar(255) NOT NULL,
  `topic_summary`         text,
  `category`              varchar(100),
  `region`                varchar(100),
  `first_seen_at`         datetime     DEFAULT NULL,
  `last_seen_at`          datetime     DEFAULT NULL,
  `article_count`         int          NOT NULL DEFAULT 0,
  `source_count`          int          NOT NULL DEFAULT 0,
  `trend_score`           decimal(6,2) DEFAULT 0,
  `local_relevance_score` decimal(6,2) DEFAULT 0,
  `status`                varchar(30)  NOT NULL DEFAULT 'active',
  `metadata_json`         json,
  `created_at`            timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            timestamp    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_topic_key` (`topic_key`),
  KEY `idx_tc_last_seen` (`last_seen_at`),
  KEY `idx_tc_status` (`status`),
  KEY `idx_tc_trend` (`trend_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) 话题与新闻关联表
--    news_id 使用 varchar(255)，与 articles.id / intelligence.id 的 varchar(255) 主键一致。
--    news_source 用于区分该 news_id 来自哪张源表（'articles' 或 'intelligence'），
--    因为两套 id 空间相互独立、可能碰撞，必须显式标注，避免关联错表。
CREATE TABLE IF NOT EXISTS `topic_articles` (
  `id`              varchar(64)  NOT NULL,
  `topic_id`        varchar(64)  NOT NULL,
  `news_id`         varchar(255) NOT NULL,
  `news_source`     varchar(20)  NOT NULL DEFAULT 'intelligence',
  `similarity_score` decimal(6,4),
  `evidence_type`   varchar(50),
  `evidence_weight` decimal(6,2) DEFAULT 0,
  `created_at`      timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_topic_news` (`topic_id`, `news_id`, `news_source`),
  KEY `idx_ta_topic` (`topic_id`),
  KEY `idx_ta_news` (`news_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3) 选题卡片表（Phase 3 才真正生成，本阶段先建表）
CREATE TABLE IF NOT EXISTS `topic_cards` (
  `id`                     varchar(64)  NOT NULL,
  `topic_id`               varchar(64)  NOT NULL,
  `title`                  varchar(255) NOT NULL,
  `recommendation_reason`  text,
  `signal_summary`         text,
  `reporting_angles`       json,
  `interview_targets`      json,
  `competitor_analysis`    text,
  `risk_notes`             json,
  `evidence_summary`       text,
  `suggested_format`       varchar(50),
  `total_score`            decimal(6,2) NOT NULL DEFAULT 0,
  `trend_score`            decimal(6,2) NOT NULL DEFAULT 0,
  `authority_score`        decimal(6,2) NOT NULL DEFAULT 0,
  `diversity_score`        decimal(6,2) NOT NULL DEFAULT 0,
  `local_score`            decimal(6,2) NOT NULL DEFAULT 0,
  `competitor_gap_score`   decimal(6,2) NOT NULL DEFAULT 0,
  `news_value_score`       decimal(6,2) NOT NULL DEFAULT 0,
  `risk_score`             decimal(6,2) NOT NULL DEFAULT 0,
  `status`                 varchar(30)  NOT NULL DEFAULT 'pending',
  `model_name`             varchar(100),
  `prompt_version`         varchar(50),
  `generated_at`           datetime     DEFAULT NULL,
  `created_at`             timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             timestamp    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tc_topic` (`topic_id`),
  KEY `idx_tc_total` (`total_score`),
  KEY `idx_tc_status` (`status`),
  KEY `idx_tc_generated` (`generated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4) 编辑反馈表
CREATE TABLE IF NOT EXISTS `topic_feedback` (
  `id`               varchar(64)  NOT NULL,
  `topic_card_id`    varchar(64)  NOT NULL,
  `feedback_type`    varchar(50)  NOT NULL,
  `feedback_note`    text,
  `operator_name`    varchar(100),
  `created_at`       timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tf_card` (`topic_card_id`),
  KEY `idx_tf_type` (`feedback_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5) 运行记录表（供运维/成本统计/失败排查）
CREATE TABLE IF NOT EXISTS `topic_radar_runs` (
  `id`                  varchar(64)  NOT NULL,
  `run_type`            varchar(50)  NOT NULL,
  `started_at`          datetime     NOT NULL,
  `finished_at`         datetime     DEFAULT NULL,
  `status`              varchar(30)  NOT NULL,
  `scanned_news_count`  int          DEFAULT 0,
  `generated_topic_count` int        DEFAULT 0,
  `generated_card_count`  int        DEFAULT 0,
  `error_count`         int          DEFAULT 0,
  `error_message`       text,
  `metadata_json`       json,
  `created_at`          timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rr_started` (`started_at`),
  KEY `idx_rr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
