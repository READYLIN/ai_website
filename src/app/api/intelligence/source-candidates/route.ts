import { NextRequest, NextResponse } from 'next/server';
import {
  getIntelligenceSourceCandidates,
  saveIntelligenceSourceCandidates,
} from '@/lib/storage';
import { IntelligenceSourceCandidateInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const candidates = await getIntelligenceSourceCandidates();
  return NextResponse.json({ count: candidates.length, candidates });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as {
    candidates?: IntelligenceSourceCandidateInput[];
  };
  if (!Array.isArray(body.candidates)) {
    return NextResponse.json({ error: 'candidates must be an array' }, { status: 400 });
  }
  const candidates = await saveIntelligenceSourceCandidates(body.candidates);
  return NextResponse.json({ accepted: candidates.length, candidates });
}
