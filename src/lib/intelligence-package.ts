import { readFileSync } from 'fs';
import path from 'path';
import { mediaSources } from './media-rss-sources';
import { peRssSources } from './pe-rss-sources';
import { sanitizeAndDedupeIntelligence } from './intelligence-rules';
import { getStoredIntelligence } from './storage';
import { keepTrackedPrivateEquityCompanies } from './private-equity-companies';
import {
  IntelligenceChannel,
  IntelligencePackage,
  IntelligenceSourceInventoryItem,
  IntelArticle,
} from './types';

interface ReportRow {
  title?: string;
  url?: string;
  source?: string;
  published?: string;
  publishedAt?: string;
  summary?: string;
  description?: string;
  company?: string;
  company_group?: string;
  companyGroup?: string;
  priority?: string;
  dimension?: string;
  matrix_label?: string;
  matrixLabel?: string;
  credibility?: string;
}

function hostOf(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function hashId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function bundledRows(channel: IntelligenceChannel): IntelArticle[] {
  const filename = channel === 'media' ? 'media-intel.json' : 'pe-intel.json';
  try {
    const parsed = JSON.parse(readFileSync(path.join(process.cwd(), 'data', filename), 'utf8')) as {
      items?: ReportRow[];
    };
    return (parsed.items || []).map((row) => ({
      id: `package-${channel}-${hashId(row.url || row.title || '')}`,
      title: row.title || '',
      description: row.description || row.summary || '',
      url: row.url || '',
      source: row.source || '',
      categories: [row.companyGroup || row.company_group || '', row.dimension || ''].filter(Boolean),
      publishedAt: row.publishedAt || row.published || '',
      author: row.company || '',
      company: row.company || '',
      companyGroup: row.companyGroup || row.company_group || '',
      priority: row.priority || '',
      dimension: row.dimension || '',
      matrixLabel: row.matrixLabel || row.matrix_label || '',
      credibility: row.credibility || '',
    }));
  } catch (error) {
    console.error(`[intelligence-package] Failed to read ${filename}:`, error);
    return [];
  }
}

function sourceInventory(channel: IntelligenceChannel, items: IntelArticle[]): IntelligenceSourceInventoryItem[] {
  const configured = channel === 'media' ? mediaSources : peRssSources;
  const rows: IntelligenceSourceInventoryItem[] = configured.map(source => ({
    name: source.name,
    host: hostOf(source.url),
    url: source.url,
    transport: /rsshub\./i.test(source.url) ? 'rsshub' : 'rss',
  }));
  for (const item of items) {
    const host = hostOf(item.url);
    if (!host) continue;
    rows.push({ name: item.source || host, host, transport: 'article' });
  }
  return Array.from(new Map(
    rows.filter(row => row.host).map(row => [`${row.transport}\0${row.host}\0${row.url || ''}`, row]),
  ).values()).sort((a, b) => a.host.localeCompare(b.host));
}

export async function buildIntelligencePackage(
  channel: IntelligenceChannel,
  requestedDays = 90,
): Promise<IntelligencePackage> {
  const days = Math.min(120, Math.max(1, Math.round(requestedDays || 90)));
  const now = new Date();
  const start = new Date(now.getTime() - days * 86400_000);
  const stored = await getStoredIntelligence(channel).catch(() => []);
  const combined = [...bundledRows(channel), ...stored];
  const scoped = channel === 'private-equity'
    ? keepTrackedPrivateEquityCompanies(combined)
    : combined;
  const items = sanitizeAndDedupeIntelligence(scoped, channel)
    .filter(item => new Date(item.publishedAt).getTime() >= start.getTime());

  return {
    schemaVersion: 1,
    channel,
    generatedAt: now.toISOString(),
    window: {
      days,
      start: start.toISOString(),
      end: now.toISOString(),
    },
    filterPolicy: {
      focus: ['业务经营', '融资募资', '投资交易', '并购收购', '项目退出', '战略合作'],
      excluded: ['董监高例行变动', '股东会/董事会例行召开', '换届与述职', '无业务事项的治理公告'],
    },
    sourceInventory: sourceInventory(channel, items),
    count: items.length,
    items,
  };
}
