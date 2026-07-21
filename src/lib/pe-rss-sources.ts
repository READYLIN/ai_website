import monitorConfig from '../../data/intelligence-entities.json';

export interface PERSSSource {
  name: string;
  url: string;
  credibility: '高' | '中高' | '中';
  company?: string;
}

function credibilityFor(name: string): PERSSSource['credibility'] {
  if (/基金业协会|中基协|公告/.test(name)) return '高';
  if (/投资界|36氪|财联社|证券时报|新浪财经|21财经|人民网|新华网|东方财富/.test(name)) return '中高';
  return '中';
}

export const peRssSources: PERSSSource[] = monitorConfig.privateEquityRssSources.map(source => ({
  name: source.name,
  url: source.url,
  credibility: credibilityFor(source.name),
}));
