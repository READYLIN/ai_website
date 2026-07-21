import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const input = process.argv[2];
if (!input) {
  throw new Error('Usage: node scripts/update-private-equity-companies.mjs <company-list.txt>');
}

const sourceText = readFileSync(input, 'utf8');
const parsed = sourceText
  .split(/\r?\n/)
  .flatMap(line => {
    const numbered = line.match(/^\s*\d+\.\s*(.+?)\s*$/)?.[1];
    if (!numbered) return [];
    const names = numbered
      .replace(/\s*（(?:投中|清科|双榜)）\s*$/, '')
      .split(/\s+或\s+/)
      .map(name => name.trim())
      .filter(Boolean);
    return names.length ? [{ name: names[0], aliases: Array.from(new Set(names.slice(1))) }] : [];
  });

const declaredCount = Number(sourceText.match(/(?:合计|总计)\s*(\d+)\s*家/)?.[1] || parsed.length);
const companies = Array.from(new Map(parsed.map(company => [company.name, company])).values());

if (companies.length !== declaredCount) {
  throw new Error(`Expected ${declaredCount} unique companies, received ${companies.length}`);
}
if (!companies.some(company => company.name === '德同资本')) {
  throw new Error('德同资本 is missing from the source list');
}

const ordered = [
  companies.find(company => company.name === '德同资本'),
  ...companies.filter(company => company.name !== '德同资本'),
];

const root = process.cwd();
const entitiesPath = path.join(root, 'data', 'intelligence-entities.json');
const entities = JSON.parse(readFileSync(entitiesPath, 'utf8'));
entities.generatedAt = new Date().toISOString();
entities.source = `${path.basename(input)} (${ordered.length} 家投中清科合并去重机构)`;
entities.privateEquity = ordered.map(company => ({
  name: company.name,
  aliases: company.aliases,
  group: company.name === '德同资本' ? '核心机构' : '活跃机构',
  code: '',
}));
entities.forcedPrivateEquityCompanies = ['德同资本'];
writeFileSync(entitiesPath, `${JSON.stringify(entities, null, 2)}\n`);

const automationConfigPath = path.resolve(
  root,
  '..',
  'private_equity_fund_automation',
  'config.json',
);
const automationConfig = JSON.parse(readFileSync(automationConfigPath, 'utf8'));
automationConfig.force_doubao_companies = ['德同资本'];
automationConfig.categories = {
  核心机构: ordered
    .filter(company => company.name === '德同资本')
    .map(company => ({ ...company, market: 'private', tier: 1 })),
  活跃机构: ordered
    .filter(company => company.name !== '德同资本')
    .map(company => ({ ...company, market: 'private', tier: 2 })),
};
writeFileSync(automationConfigPath, `${JSON.stringify(automationConfig, null, 2)}\n`);

copyFileSync(input, path.join(root, 'data', 'private-equity-companies-source.txt'));

console.log(`Updated AI_web and automation targets with ${ordered.length} institutions.`);
