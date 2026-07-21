import { NextResponse } from 'next/server';
import { normalizeNewsletterTopics } from '@/lib/newsletter';
import { upsertSubscriber } from '@/lib/storage';
import { syncButtondownSubscriber } from '@/lib/buttondown';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: unknown; topics?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const topics = normalizeNewsletterTopics(body?.topics);

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
  }
  if (topics.length === 0) {
    return NextResponse.json({ error: '请至少选择一个订阅栏目' }, { status: 400 });
  }

  try {
    const referrerUrl = request.headers.get('referer') || undefined;
    const saved = await upsertSubscriber(email, topics, 'pending');
    if (!saved) {
      return NextResponse.json({ error: '云端存储暂时不可用，请稍后再试' }, { status: 503 });
    }

    const provider = await syncButtondownSubscriber(email, topics, referrerUrl);
    if (!provider.ok) {
      return NextResponse.json(
        { error: provider.detail || '邮件服务暂时不可用，偏好已安全保存' },
        { status: provider.status >= 400 && provider.status < 600 ? provider.status : 502 },
      );
    }

    await upsertSubscriber(email, topics, 'active');
    return NextResponse.json({ success: true, topics });
  } catch (error) {
    console.error('[subscribe] Unexpected error:', error);
    return NextResponse.json({ error: '订阅服务暂时不可用，请稍后再试' }, { status: 500 });
  }
}
