import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = 'https://aiweb-roan.vercel.app';

  const staticPages = [
    { url: siteUrl, changeFrequency: 'hourly' as const, priority: 1.0 },
    { url: `${siteUrl}/media`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${siteUrl}/private-equity`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${siteUrl}/papers`, changeFrequency: 'hourly' as const, priority: 0.8 },
    { url: `${siteUrl}/bookmarks`, changeFrequency: 'daily' as const, priority: 0.3 },
    { url: `${siteUrl}/search`, changeFrequency: 'daily' as const, priority: 0.3 },
  ];

  return staticPages;
}