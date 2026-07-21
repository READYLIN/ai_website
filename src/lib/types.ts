export interface Article {
  id: string;
  title: string;
  titleZh?: string;
  description: string;
  descriptionZh?: string;
  content?: string;
  contentZh?: string;
  url: string;
  imageUrl?: string;
  source: string;
  sourceIcon?: string;
  categories: string[];
  publishedAt: string;
  author?: string;
}

export interface RSSSource {
  name: string;
  url: string;
  icon?: string;
  category: 'english' | 'chinese';
}

export interface IntelArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  categories: string[];
  publishedAt: string;
  author: string;
  company?: string;
  companyGroup?: string;
  priority?: string;
  dimension?: string;
  matrixLabel?: string;
  credibility?: string;
}

export interface SearchResult {
  article: Article;
  score: number;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  publishedAt: string;
  pdfUrl: string;
  arxivUrl: string;
  source: 'arxiv' | 'openalex' | 'semantic-scholar';
  citationCount?: number;
  venue?: string;
}

export type IntelligenceChannel = 'media' | 'private-equity';

export interface IntelligenceSourceInventoryItem {
  name: string;
  host: string;
  url?: string;
  transport: 'rss' | 'rsshub' | 'article';
}

export interface IntelligencePackage {
  schemaVersion: 1;
  channel: IntelligenceChannel;
  generatedAt: string;
  window: { days: number; start: string; end: string };
  filterPolicy: { focus: string[]; excluded: string[] };
  sourceInventory: IntelligenceSourceInventoryItem[];
  count: number;
  items: IntelArticle[];
}

export interface IntelligenceSourceCandidateInput {
  channel: IntelligenceChannel;
  sourceName: string;
  articleUrl: string;
  directFeedUrl?: string;
  rsshubRouteHint?: string;
  evidenceTitle?: string;
  discoveredAt?: string;
}

export interface IntelligenceSourceCandidate extends IntelligenceSourceCandidateInput {
  id: string;
  host: string;
  status: 'candidate' | 'approved' | 'rejected';
  sightings: number;
  firstSeenAt: string;
  lastSeenAt: string;
  evidenceTitles: string[];
}

export interface SubscriberRecord {
  email: string;
  topics: import('./newsletter').NewsletterTopic[];
  status: 'pending' | 'active';
  source: string;
  createdAt: string;
  updatedAt: string;
}
