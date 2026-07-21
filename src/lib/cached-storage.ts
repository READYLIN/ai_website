import { unstable_cache } from 'next/cache';
import {
  getStoredArticleById,
  getStoredArticleList,
  getStoredIntelligenceList,
  getStoredPaperById,
  getStoredPaperList,
} from './storage';

const CACHE_SECONDS = 300;

export const getCachedArticles = unstable_cache(
  async () => getStoredArticleList(),
  ['cloud-storage-article-list-v2'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-articles'] },
);

export const getCachedPapers = unstable_cache(
  async () => getStoredPaperList(),
  ['cloud-storage-paper-list-v2'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-papers'] },
);

export const getCachedMediaIntelligence = unstable_cache(
  async () => getStoredIntelligenceList('media'),
  ['cloud-storage-intelligence-media-list-v2'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-intelligence-media'] },
);

export const getCachedPrivateEquityIntelligence = unstable_cache(
  async () => getStoredIntelligenceList('private-equity'),
  ['cloud-storage-intelligence-private-equity-list-v2'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-intelligence-private-equity'] },
);

export const getCachedArticleById = unstable_cache(
  async (id: string) => getStoredArticleById(id),
  ['cloud-storage-article-detail-v1'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-articles'] },
);

export const getCachedPaperById = unstable_cache(
  async (id: string) => getStoredPaperById(id),
  ['cloud-storage-paper-detail-v1'],
  { revalidate: CACHE_SECONDS, tags: ['cloud-storage-papers'] },
);
