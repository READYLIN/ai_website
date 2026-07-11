const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&gt;': '>',
  '&hellip;': '…',
  '&lt;': '<',
  '&nbsp;': ' ',
  '&quot;': '"',
};

/**
 * RSS translations occasionally arrive wrapped in a complete HTML document.
 * Keep markup out of compact UI surfaces without mutating the stored article.
 */
export function cleanDisplayText(value?: string): string {
  if (!value) return '';

  return value
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(amp|apos|#39|gt|hellip|lt|nbsp|quot);/g, (entity) => HTML_ENTITIES[entity] || entity)
    .replace(/\s+/g, ' ')
    .trim();
}

export function articleDisplayCopy(article: {
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
}) {
  const title = cleanDisplayText(article.titleZh || article.title) || '未命名文章';
  const originalTitle = cleanDisplayText(article.title);
  const description = cleanDisplayText(article.descriptionZh || article.description);
  const originalDescription = cleanDisplayText(article.description);

  return {
    title,
    originalTitle: originalTitle !== title ? originalTitle : '',
    description,
    originalDescription: originalDescription !== description ? originalDescription : '',
  };
}
