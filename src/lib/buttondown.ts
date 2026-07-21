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

export interface ButtondownEmailFilters {
  filters: Array<{
    field: 'subscriber.tags';
    operator: 'contains';
    value: string;
  }>;
  groups: [];
  predicate: 'and';
}

export function buildButtondownEmailFilters(tagId: string): ButtondownEmailFilters {
  if (!tagId.trim()) throw new Error('Buttondown topic tag ID is required');
  return {
    filters: [{ field: 'subscriber.tags', operator: 'contains', value: tagId }],
    groups: [],
    predicate: 'and',
  };
}

/** Send one topic email only to subscribers carrying that topic's Buttondown tag. */
export async function sendButtondownPost(
  topic: NewsletterTopic,
  subject: string,
  bodyHtml: string,
  emailId?: string,
): Promise<{ ok: boolean; postId?: string; error?: string }> {
  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) return { ok: false, error: 'BUTTONDOWN_API_KEY not configured' };

  const timeoutMs = 15000;
  const topicTag = NEWSLETTER_TOPIC_META[topic].tag;
  const tagId = await resolveButtondownTagId(topicTag);
  if (!tagId) {
    return { ok: false, error: `Buttondown topic tag not found: ${topicTag}` };
  }

  const url = emailId ? `${API_ROOT}/emails/${emailId}` : `${API_ROOT}/emails`;
  const method = emailId ? 'PATCH' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: headers(apiKey),
      body: JSON.stringify({
        subject,
        body: bodyHtml,
        status: 'about_to_send',
        filters: buildButtondownEmailFilters(tagId),
        metadata: { newsletter_topic: topic },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json().catch(() => ({})) as { id?: string; detail?: string };
    if (!response.ok) {
      return { ok: false, error: data.detail || `Buttondown email request failed (${response.status})` };
    }
    return { ok: true, postId: data.id };
  } catch (error) {
    console.error('[buttondown] Failed to send post:', error);
    return { ok: false, error: (error as Error).message };
  }
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
      {
        headers: headers(apiKey),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!lookup.ok) {
      const data = await lookup.json().catch(() => ({})) as { detail?: string };
      return { ok: false, status: lookup.status, detail: data.detail || 'Subscriber lookup failed' };
    }
    const lookupData = await lookup.json() as { results?: ButtondownSubscriber[] };
    existing = lookupData.results?.find(
      (subscriber) => subscriber.email_address.toLowerCase() === normalizedEmail,
    );

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
        signal: AbortSignal.timeout(10000),
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
      signal: AbortSignal.timeout(10000),
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
    const tagPromise = fetch(`${API_ROOT}/tags?page_size=100`, {
      headers: headers(apiKey),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    }).then(r => r.json()) as Promise<{ results?: { id: string; name: string }[] }>;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Buttondown tag lookup timeout')), 5000)
    );
    const data = await Promise.race([tagPromise, timeoutPromise]);
    return data.results?.find((tag) => tag.name === tagName)?.id || null;
  } catch (error) {
    console.error('[buttondown] Failed to resolve tag:', error);
    return null;
  }
}
