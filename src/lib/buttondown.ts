import { getNewsletterTags, NEWSLETTER_TOPIC_META, NEWSLETTER_TOPICS, NewsletterTopic } from './newsletter';

const API_ROOT = 'https://api.buttondown.com/v1';

interface ButtondownSubscriber {
  id: string;
  email_address: string;
  tags: string[];
}

function headers(apiKey: string): HeadersInit {
  return {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

export async function syncButtondownSubscriber(
  email: string,
  topics: NewsletterTopic[],
  referrerUrl?: string,
): Promise<{ ok: boolean; status: number; detail?: string }> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return { ok: false, status: 500, detail: 'BUTTONDOWN_API_KEY not configured' };

  const normalizedEmail = email.trim().toLowerCase();
  const topicTags = new Set(NEWSLETTER_TOPICS.map((topic) => NEWSLETTER_TOPIC_META[topic].tag));
  let existing: ButtondownSubscriber | undefined;

  try {
    const lookup = await fetch(
      `${API_ROOT}/subscribers?email_address=${encodeURIComponent(normalizedEmail)}&page_size=20`,
      { headers: headers(apiKey), cache: 'no-store' },
    );

    if (lookup.ok) {
      const data = await lookup.json() as { results?: ButtondownSubscriber[] };
      existing = data.results?.find(
        (subscriber) => subscriber.email_address.toLowerCase() === normalizedEmail,
      );
    }

    const chosenTags = getNewsletterTags(topics);
    if (existing) {
      const preservedTags = (existing.tags || []).filter(
        (tag) => !topicTags.has(tag) && tag !== 'newsroom-subscriber',
      );
      const response = await fetch(`${API_ROOT}/subscribers/${existing.id}`, {
        method: 'PATCH',
        headers: headers(apiKey),
        body: JSON.stringify({
          tags: [...preservedTags, ...chosenTags],
          metadata: { newsletter_topics: topics },
        }),
      });
      const data = response.ok ? undefined : await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, detail: data?.detail };
    }

    const response = await fetch(`${API_ROOT}/subscribers`, {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        email_address: normalizedEmail,
        tags: chosenTags,
        metadata: { newsletter_topics: topics },
        referrer_url: referrerUrl,
      }),
    });
    const data = response.ok ? undefined : await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, detail: data?.detail };
  } catch (error) {
    console.error('[buttondown] Subscriber sync failed:', error);
    return { ok: false, status: 502, detail: 'Newsletter provider unavailable' };
  }
}

export async function resolveButtondownTagId(tagName: string): Promise<string | null> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_ROOT}/tags?page_size=100`, {
      headers: headers(apiKey),
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json() as { results?: { id: string; name: string }[] };
    return data.results?.find((tag) => tag.name === tagName)?.id || null;
  } catch (error) {
    console.error('[buttondown] Failed to resolve tag:', error);
    return null;
  }
}

