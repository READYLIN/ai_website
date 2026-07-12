import { readFileSync } from 'fs';
import { IntelArticle } from './types';

const PE_REPORT_PATH =
  '/Users/z1/Documents/New project/private_equity_fund_automation/pe_vc_weekly_last_report.json';

const PE_CONFIG_PATH =
  '/Users/z1/Documents/New project/private_equity_fund_automation/config.json';

interface PEItem {
  title: string;
  url: string;
  source: string;
  published: string;
  summary: string;
  company: string;
  company_group: string;
  priority: string;
  dimension: string;
  matrix_label: string;
  channel: string;
  credibility: string;
  verification_notes: string;
}

function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return 'pe-' + Math.abs(h).toString(16).slice(0, 12);
}

/**
 * Read PE/VC weekly intelligence report.
 */
export function fetchPEIntel(): IntelArticle[] {
  try {
    const raw = readFileSync(PE_REPORT_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const items: PEItem[] = data.items || [];

    return items.map((item) => ({
      id: hashId(item.url || item.title),
      title: item.title || '',
      description: item.summary || '',
      url: item.url || '',
      source: item.source || '',
      categories: [item.company_group || '私募', item.dimension || ''].filter(Boolean),
      publishedAt: item.published
        ? new Date(item.published).toISOString()
        : new Date().toISOString(),
      author: item.company || '',
      company: item.company || '',
      companyGroup: item.company_group || '',
      priority: item.priority || '',
      dimension: item.dimension || '',
      matrixLabel: item.matrix_label || '',
      credibility: item.credibility || '',
    }));
  } catch (err) {
    console.error('[pe-intel] Failed to read PE report:', err);
    return [];
  }
}

/**
 * Get available company groups for filtering.
 */
export function getPEGroups(): string[] {
  const all = fetchPEIntel();
  const groups = new Set(all.map((a) => a.companyGroup).filter(Boolean));
  return Array.from(groups).sort() as string[];
}

/**
 * Get available dimensions.
 */
export function getPEDimensions(): string[] {
  const all = fetchPEIntel();
  const dims = new Set(all.map((a) => a.dimension).filter(Boolean));
  return Array.from(dims).sort() as string[];
}