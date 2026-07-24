// 识澜·账户系统 — 用户表数据访问（DB 操作）
// ---------------------------------------------------------------------------
// 账号密码「无格式限制」：仅做「用户名非空、去除首尾空白、唯一」这一最小约束
// （唯一性由 DB uniq_username 保证；这里额外给出友好报错）。密码任意，哈希后入库。

import { randomBytes } from 'crypto';
import { getPool } from '../storage';
import type { RowDataPacket } from 'mysql2/promise';
import { hashPassword, verifyPassword } from './password';

export interface AuthUser {
  id: string;
  username: string;
}

interface UserRow extends RowDataPacket {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
}

function genUserId(): string {
  return `usr_${randomBytes(12).toString('hex')}`;
}

/** 按用户名查用户（含哈希，仅内部登录校验用）。无则 null。 */
async function findRowByUsername(username: string): Promise<UserRow | null> {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = ? LIMIT 1',
    [username],
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** 按 ID 查用户（对外安全字段）。无则 null。 */
export async function findUserById(id: string): Promise<AuthUser | null> {
  const pool = getPool();
  if (!pool) return null;
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, username, password_hash, created_at FROM users WHERE id = ? LIMIT 1',
    [id],
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { id: rows[0].id, username: rows[0].username };
}

/** 用户名是否已存在。 */
export async function usernameExists(username: string): Promise<boolean> {
  return (await findRowByUsername(username)) !== null;
}

/**
 * 注册：创建新用户。用户名去空白后不能为空且需唯一；密码无限制。
 * 成功返回对外用户对象；失败抛错（数据库未连、用户名为空、已存在等）。
 */
export async function createUser(username: string, password: string): Promise<AuthUser> {
  const pool = getPool();
  if (!pool) throw new Error('数据库未连接，无法注册');
  const name = (username ?? '').trim();
  if (!name) throw new Error('请填写用户名');
  if (await usernameExists(name)) throw new Error('该用户名已被注册');

  const id = genUserId();
  const passwordHash = hashPassword(password ?? '');
  try {
    await pool.query(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
      [id, name, passwordHash, new Date()],
    );
  } catch (e) {
    // 并发下唯一键冲突兜底
    const msg = e instanceof Error ? e.message : '';
    if (/duplicate/i.test(msg)) throw new Error('该用户名已被注册');
    throw e;
  }
  return { id, username: name };
}

/**
 * 登录校验：用户名 + 密码。成功返回对外用户对象；失败返回 null（不区分
 * 「用户名不存在」与「密码错误」，避免用户名枚举）。
 */
export async function verifyCredentials(username: string, password: string): Promise<AuthUser | null> {
  const name = (username ?? '').trim();
  if (!name) return null;
  const row = await findRowByUsername(name);
  if (!row) return null;
  if (!verifyPassword(password ?? '', row.password_hash)) return null;
  return { id: row.id, username: row.username };
}
