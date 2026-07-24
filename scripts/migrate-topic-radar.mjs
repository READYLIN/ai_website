// 识澜·观潮 Phase 1 — 数据库迁移执行器
// 读取 .env.local 中的 MYSQL_* 配置，执行 scripts/migrate-topic-radar.sql。
// 可重复执行（SQL 内部全部 IF NOT EXISTS）。
//
// 用法：
//   node scripts/migrate-topic-radar.mjs
//
// 依赖：mysql2（项目已安装）

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// 极简 .env.local 加载（不引入 dotenv 依赖）
function loadEnvLocal() {
  const p = join(ROOT, '.env.local');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const config = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'ai_web',
  multipleStatements: true, // 一次执行整个 SQL 文件
};

const sqlPath = join(ROOT, 'scripts', 'migrate-topic-radar.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`USE \`${config.database}\``);
    await conn.query(sql);

    // ── 增量列（幂等）：card 版本与 is_latest 归档机制 ──
    // 用 information_schema 判断列是否存在，避免重复 ALTER 报错（满足“重复执行迁移不报错”）。
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME AS c FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'topic_cards'
         AND COLUMN_NAME IN ('is_latest','version')`,
      [config.database],
    );
    const have = new Set(cols.map((r) => r.c));
    if (!have.has('is_latest')) {
      await conn.query('ALTER TABLE topic_cards ADD COLUMN is_latest TINYINT(1) NOT NULL DEFAULT 1');
      console.log('[topic-radar] added column topic_cards.is_latest');
    }
    if (!have.has('version')) {
      await conn.query('ALTER TABLE topic_cards ADD COLUMN version INT NOT NULL DEFAULT 1');
      console.log('[topic-radar] added column topic_cards.version');
    }
    // 确保 is_latest 索引存在（幂等：ignored 错误可忽略）
    await conn.query('ALTER TABLE topic_cards ADD KEY idx_tc_is_latest (is_latest)').catch(() => undefined);

    // 回填：每个话题仅“最新一张(generated_at 最大)”标记 is_latest=1，其余=0。
    // 重复执行安全（幂等）。
    await conn.query(`
      UPDATE topic_cards c
      JOIN (SELECT topic_id, MAX(generated_at) AS mx FROM topic_cards GROUP BY topic_id) m
        ON c.topic_id = m.topic_id
      SET c.is_latest = CASE WHEN c.generated_at = m.mx THEN 1 ELSE 0 END
    `);
    console.log('[topic-radar] is_latest backfill applied (idempotent).');

    console.log('[topic-radar] migration applied (idempotent). Tables ensured:');
    const [rows] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name LIKE 'topic_%' ORDER BY table_name",
      [config.database],
    );
    for (const r of rows) console.log('  -', r.TABLE_NAME || r.table_name);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[topic-radar] migration failed:', err?.message || err);
  process.exit(1);
});
