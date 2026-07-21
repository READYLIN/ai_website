import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(projectRoot, '..');

const inputs = {
  media: process.env.MEDIA_MONITOR_CONFIG || join(workspaceRoot, 'media_weekly_automation', 'config.json'),
  privateEquity: process.env.PE_MONITOR_CONFIG || join(workspaceRoot, 'private_equity_fund_automation', 'config.json'),
  mediaReport: process.env.MEDIA_REPORT_PATH || join(workspaceRoot, 'media_weekly_automation', 'competitive_intel_last_report.json'),
  privateEquityReport: process.env.PE_REPORT_PATH || join(workspaceRoot, 'private_equity_fund_automation', 'pe_vc_weekly_last_report.json'),
  mediaHistory: process.env.MEDIA_HISTORY_PATH || '',
  privateEquityHistory: process.env.PE_HISTORY_PATH || '',
};

function readJsonIfPresent(file) {
  return file && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

function reportItemKey(item) {
  const url = String(item.url || '').trim().replace(/\/$/, '').toLowerCase();
  if (url) return `url:${url}`;
  const title = String(item.title || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return `title:${title}`;
}

function mergeReports(destination, source, historyPath) {
  const current = readJsonIfPresent(destination);
  const history = readJsonIfPresent(historyPath);
  const latest = JSON.parse(readFileSync(source, 'utf8'));
  const merged = new Map();

  // Latest rows overwrite matching historical rows, while unmatched historical
  // rows stay available for the cloud's append-only intelligence archive.
  for (const report of [history, current, latest]) {
    for (const item of report?.items || []) {
      const key = reportItemKey(item);
      if (key !== 'title:') merged.set(key, item);
    }
  }

  const items = Array.from(merged.values()).sort((a, b) => {
    const right = Date.parse(b.published || '') || 0;
    const left = Date.parse(a.published || '') || 0;
    return right - left;
  });
  writeFileSync(destination, `${JSON.stringify({ ...latest, items }, null, 2)}\n`, 'utf8');
  return items.length;
}

function readMonitorConfig(file) {
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const seen = new Set();
  const entities = [];
  let configuredCount = 0;

  for (const [group, rows] of Object.entries(config.categories || {})) {
    for (const row of rows) {
      const name = String(row.name || '').trim();
      if (!name) continue;
      configuredCount += 1;
      if (seen.has(name)) continue;
      seen.add(name);
      entities.push({
        name,
        aliases: Array.from(new Set(
          (Array.isArray(row.aliases) ? row.aliases : [])
            .map(alias => String(alias || '').trim())
            .filter(Boolean),
        )),
        group,
        code: String(row.code || '').trim(),
      });
    }
  }

  return {
    entities,
    configuredCount,
    rssSources: (config.rss_sources || []).map(source => ({
      name: String(source.name || '').trim(),
      url: String(source.url || '').trim(),
      category: String(source.category || '').trim(),
    })).filter(source => source.name && source.url),
    forcedCompanies: (config.force_doubao_companies || []).map(String).filter(Boolean),
  };
}

const mediaConfig = readMonitorConfig(inputs.media);
const privateEquityConfig = readMonitorConfig(inputs.privateEquity);

const payload = {
  generatedAt: new Date().toISOString(),
  source: 'media_weekly_report.py + pe_vc_weekly_report.py monitoring configs',
  media: mediaConfig.entities,
  mediaConfiguredCount: mediaConfig.configuredCount,
  privateEquity: privateEquityConfig.entities,
  privateEquityConfiguredCount: privateEquityConfig.configuredCount,
  mediaRssSources: mediaConfig.rssSources,
  privateEquityRssSources: privateEquityConfig.rssSources,
  forcedPrivateEquityCompanies: privateEquityConfig.forcedCompanies,
};

writeFileSync(
  join(projectRoot, 'data', 'intelligence-entities.json'),
  `${JSON.stringify(payload, null, 2)}\n`,
  'utf8',
);

const mediaReportCount = mergeReports(
  join(projectRoot, 'data', 'media-intel.json'),
  inputs.mediaReport,
  inputs.mediaHistory,
);
const privateEquityReportCount = mergeReports(
  join(projectRoot, 'data', 'pe-intel.json'),
  inputs.privateEquityReport,
  inputs.privateEquityHistory,
);

console.log(`Synced ${payload.mediaConfiguredCount} media monitoring entries (${payload.media.length} unique), ${payload.privateEquityConfiguredCount} PE/VC monitoring entries (${payload.privateEquity.length} unique), ${payload.mediaRssSources.length + payload.privateEquityRssSources.length} configured RSS sources, ${mediaReportCount} media report rows, and ${privateEquityReportCount} PE/VC report rows.`);
