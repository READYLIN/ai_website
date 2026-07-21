export const NEWSLETTER_TOPICS = ['media', 'private-equity', 'ai'] as const;

export type NewsletterTopic = (typeof NEWSLETTER_TOPICS)[number];

export const NEWSLETTER_TOPIC_META: Record<NewsletterTopic, {
  label: string;
  shortLabel: string;
  description: string;
  tag: string;
}> = {
  ai: {
    label: 'AI 资讯',
    shortLabel: 'AI',
    description: '产品发布、产业变化与前沿论文',
    tag: 'topic-ai',
  },
  media: {
    label: '传媒情报',
    shortLabel: '传媒',
    description: '媒体机构、广电与上市公司动态',
    tag: 'topic-media',
  },
  'private-equity': {
    label: '私募股权',
    shortLabel: '私募',
    description: '募资、投资、融资、并购与退出',
    tag: 'topic-private-equity',
  },
};

export function normalizeNewsletterTopics(value: unknown): NewsletterTopic[] {
  if (!Array.isArray(value)) return [];
  return NEWSLETTER_TOPICS.filter((topic) => value.includes(topic));
}

export function getNewsletterTags(topics: NewsletterTopic[]): string[] {
  return ['newsroom-subscriber', ...topics.map((topic) => NEWSLETTER_TOPIC_META[topic].tag)];
}
