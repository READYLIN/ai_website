import { Article } from './types';

// Authority weights for known high-quality sources
const SOURCE_WEIGHTS: Record<string, number> = {
  '量子位': 5, '机器之心': 5, '新智元': 4,
  'MIT Tech Review': 5, 'TechCrunch AI': 4, 'The Verge AI': 3,
  'OpenAI Blog': 5, 'Google AI Blog': 4, 'VentureBeat AI': 3,
  '36氪 AI': 4, '极客公园': 3, '腾讯技术工程': 3, 'AI前线': 3,
};

export function heatScore(article: Article): number {
  let score = 0;

  // Authority bonus
  score += (SOURCE_WEIGHTS[article.source] || 1) * 10;

  // Recency bonus: articles within 24h get +20, within 48h +10
  const hoursAgo = (Date.now() - new Date(article.publishedAt).getTime()) / 3600000;
  if (hoursAgo < 12) score += 30;
  else if (hoursAgo < 24) score += 20;
  else if (hoursAgo < 48) score += 10;

  // Content depth bonus: longer descriptions = more substantive
  const descLen = (article.descriptionZh || article.description || '').length;
  if (descLen > 200) score += 15;
  else if (descLen > 100) score += 10;
  else if (descLen > 50) score += 5;

  // Image bonus: articles with images are more engaging
  if (article.imageUrl) score += 5;

  // Category diversity: having more categories = broader relevance
  if ((article.categories || []).length >= 3) score += 5;

  return score;
}

export function getTrending(articles: Article[], count = 5): Article[] {
  return [...articles]
    .map(a => ({ article: a, score: heatScore(a) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(r => r.article);
}