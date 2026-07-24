// 识澜·账户系统 — 密码哈希（纯函数，仅依赖 Node 内置 crypto）
// ---------------------------------------------------------------------------
// 设计要点：
//   * 账号密码「无格式限制」——不做长度/复杂度校验（按产品要求）。空密码亦允许，
//     但仍会被安全哈希后存储，绝不明文落库。
//   * 使用 scrypt（Node 内置，无需第三方依赖），每个密码独立随机盐；
//     存储格式为 `scrypt$N$saltHex$hashHex`，便于日后调参与校验。
//   * 校验使用 timingSafeEqual 做定长比较，避免时序侧信道。

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEYLEN = 64; // 派生密钥长度（字节）
const COST = 16384; // scrypt N（CPU/内存成本），2^14，兼顾安全与速度

/**
 * 计算密码哈希，返回可直接入库的字符串：`scrypt$<N>$<saltHex>$<hashHex>`。
 * 对任意输入（含空串）都能安全哈希；不抛错。
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password ?? '', salt, KEYLEN, { N: COST });
  return `scrypt$${COST}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * 校验明文密码与已存哈希是否匹配。格式非法或不匹配返回 false（不抛错）。
 */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'scrypt') return false;
  const cost = Number(parts[1]);
  const saltHex = parts[2];
  const hashHex = parts[3];
  if (!Number.isFinite(cost) || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = scryptSync(password ?? '', salt, expected.length, { N: cost });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
