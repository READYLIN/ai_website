import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { buildIntelligencePackage } from '@/lib/intelligence-package';
import { IntelligenceChannel } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel') as IntelligenceChannel | null;
  if (!channel || !['media', 'private-equity'].includes(channel)) {
    return NextResponse.json({ error: 'channel must be media or private-equity' }, { status: 400 });
  }
  const days = Number.parseInt(request.nextUrl.searchParams.get('days') || '90', 10);
  const data = await buildIntelligencePackage(channel, Number.isFinite(days) ? days : 90);
  const body = JSON.stringify(data);
  const etag = `"${createHash('sha256').update(body).digest('hex')}"`;
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304 });
  const filename = `ai-web-${channel}-${data.generatedAt.slice(0, 10)}.json`;
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-cache, no-store, max-age=0',
      ETag: etag,
    },
  });
}
