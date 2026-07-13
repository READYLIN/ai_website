import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { rssSources } from '@/lib/rss-sources';
import { getAvailableMonths, getStorageStats } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error' | 'warning'> = {};

  // Redis check
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const redis = new Redis({ url, token });
      await redis.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'warning';
    }
  } catch {
    checks.redis = 'error';
  }

  // Buttondown check
  checks.buttondown = process.env.BUTTONDOWN_API_KEY ? 'ok' : 'warning';

  // Storage stats
  let storageStats: any = null;
  try { storageStats = await getStorageStats(); } catch {}

  return NextResponse.json({
    status: Object.values(checks).some(v => v === 'error') ? 'degraded' : 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
    rssSources: rssSources.map(s => s.name),
    storage: storageStats,
  });
}