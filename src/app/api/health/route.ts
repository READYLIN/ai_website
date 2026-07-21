import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import path from 'path';
import { rssSources } from '@/lib/rss-sources';
import { mediaSources } from '@/lib/media-rss-sources';
import { peRssSources } from '@/lib/pe-rss-sources';
import { getStorageStats } from '@/lib/storage';
import monitorConfig from '../../../../data/intelligence-entities.json';

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

  // Local structured-intelligence manifest (cloud counts are reported below)
  let intelligence: unknown = null;
  try {
    const manifest = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'intelligence-system.json'), 'utf-8'));
    intelligence = manifest;
    checks.intelligence = manifest?.status === 'ok' ? 'ok' : 'warning';
  } catch {
    checks.intelligence = 'warning';
  }

  // Storage stats
  let storageStats: any = null;
  try { storageStats = await getStorageStats(); } catch {}

  return NextResponse.json({
    status: Object.values(checks).some(v => v === 'error') ? 'degraded' : 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks,
    rssSources: rssSources.map(s => s.name),
    intelligenceSources: {
      mediaRss: mediaSources.length,
      privateEquityRss: peRssSources.length,
      eastmoneyCompanies: monitorConfig.privateEquity.length,
      forcedEastmoneyCompanies: monitorConfig.forcedPrivateEquityCompanies,
      eastmoneyBatchLimit: Number.parseInt(process.env.TARGETED_RSS_COMPANY_LIMIT || '48', 10),
    },
    storage: storageStats,
    intelligence,
  });
}
