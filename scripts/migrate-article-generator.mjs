// 识澜·智稿 — 数据库迁移执行器
// 读取 .env.local 中的 MYSQL_* 配置，执行 scripts/migrate-article-generator.sql。
// 可重复执行（SQL 内部全部 IF NOT EXISTS）；不修改/删除现有表。
//
// 用法：
//   node scripts/migrate-article-generator.mjs
//
// 依赖：mysql2（项目已安装）；不引入 dotenv，自行极简解析 .env.local。

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import mysql from 'mysql2/promise';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

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
  multipleStatements: true,
};

const sqlPath = join(ROOT, 'scripts', 'migrate-article-generator.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`USE \`${config.database}\``);
    await conn.query(sql);
    console.log('[article-generator] migration applied (idempotent). Tables ensured:');
    const [rows] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('generated_articles','generated_article_evidence','article_fact_checks') ORDER BY table_name",
      [config.database],
    );
    for (const r of rows) console.log('  -', r.TABLE_NAME || r.table_name);

    // 2026-07-23：「用户手填证据」需要的冗余列（幂等，按 information_schema 判断是否存在）。
    // 不放进 .sql 用 ADD COLUMN IF NOT EXISTS，以避开不同客户端对该语法的兼容差异。
    await ensureInlineEvidenceColumns(conn, config.database);
  } finally {
    await conn.end();
  }
}

/** 给 generated_article_evidence 增加手填证据冗余列（已存在则跳过）。 */
async function ensureInlineEvidenceColumns(conn, db) {
  const needed = [
    ['title', 'VARCHAR(512) NULL'],
    ['source', 'VARCHAR(255) NULL'],
    ['url', 'VARCHAR(1024) NULL'],
    ['published_at', 'VARCHAR(64) NULL'],
    ['summary', 'TEXT NULL'],
    ['is_inline', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ];
  const [cols] = await conn.query(
    'SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = ? AND table_name = ?',
    [db, 'generated_article_evidence'],
  );
  const existing = new Set(cols.map((c) => c.COLUMN_NAME));
  const adds = needed.filter(([colName]) => !existing.has(colName)).map(([colName, def]) => `ADD COLUMN \`${colName}\` ${def}`);
  if (adds.length === 0) {
    console.log('  - generated_article_evidence: inline columns already present');
    return;
  }
  await conn.query(`ALTER TABLE generated_article_evidence ${adds.join(', ')}`);
  console.log('  - generated_article_evidence: added inline columns', adds.map((a) => a.match(/`(\w+)`/)[1]).join(', '));
}

main().catch((err) => {
  console.error('[article-generator] migration failed:', err?.message || err);
  process.exit(1);
});
