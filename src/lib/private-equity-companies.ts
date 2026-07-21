import monitorConfig from '../../data/intelligence-entities.json';
import type { IntelArticle } from './types';

interface PrivateEquityEntity {
  name: string;
  aliases?: string[];
  code?: string;
  group: string;
}

const entities = monitorConfig.privateEquity as PrivateEquityEntity[];

export const PRIVATE_EQUITY_COMPANIES = entities.map(entity => entity.name);
export const PRIVATE_EQUITY_COMPANY_COUNT = PRIVATE_EQUITY_COMPANIES.length;

const companyGroups = new Map(entities.map(entity => [entity.name, entity.group]));
const aliasesToCompany = new Map<string, string>();
for (const entity of entities) {
  for (const alias of [entity.name, ...(entity.aliases || []), entity.code || '']) {
    const value = alias.trim();
    if (value.length >= 2 && !aliasesToCompany.has(value)) aliasesToCompany.set(value, entity.name);
  }
}
const companyAliasesBySpecificity = Array.from(aliasesToCompany.keys())
  .sort((a, b) => b.length - a.length || a.localeCompare(b, 'zh-CN'));

export function matchTrackedPrivateEquityCompany(article: IntelArticle): string | null {
  const explicit = article.company?.trim();
  if (explicit && companyGroups.has(explicit)) return explicit;
  if (explicit && aliasesToCompany.has(explicit)) return aliasesToCompany.get(explicit) || null;

  const searchable = `${article.company || ''} ${article.title || ''} ${article.description || ''}`;
  const alias = companyAliasesBySpecificity.find(candidate => searchable.includes(candidate));
  return alias ? aliasesToCompany.get(alias) || null : null;
}

export function keepTrackedPrivateEquityCompanies(articles: IntelArticle[]): IntelArticle[] {
  return articles.flatMap(article => {
    const company = matchTrackedPrivateEquityCompany(article);
    if (!company) return [];
    return [{
      ...article,
      author: company,
      company,
      companyGroup: companyGroups.get(company) || '活跃机构',
    }];
  });
}
