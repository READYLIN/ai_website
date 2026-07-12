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
