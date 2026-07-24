// 识澜·智稿 — LLM 设置表迁移执行器
// 读取 .env.local 中的 MYSQL_* 配置，执行 scripts/migrate-llm-settings.sql。
// 可重复执行（SQL 内部 IF NOT EXISTS）；不修改/删除现有表。
//
// 用法：
//   node scripts/migrate-llm-settings.mjs
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

const sqlPath = join(ROOT, 'scripts', 'migrate-llm-settings.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function main() {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.query(`USE \`${config.database}\``);
    await conn.query(sql);
    console.log('[llm-settings] migration applied (idempotent). Table ensured: llm_settings');
    const [rows] = await conn.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'llm_settings'",
      [config.database],
    );
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('[llm-settings] OK: llm_settings exists.');
    } else {
      console.error('[llm-settings] WARNING: llm_settings not found after migration.');
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[llm-settings] migration failed:', err.message);
  process.exit(1);
});
