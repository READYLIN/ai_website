import { Redis } from '@upstash/redis';
import { writeFileSync } from 'fs';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
const hash = await redis.hgetall('intelligence:non-listed-doubao');
const items = Object.values(hash || {}).map(v => (typeof v === 'string' ? JSON.parse(v) : v));
const byCompany = {};
for (const it of items) { (byCompany[it.company] ||= []).push(it); }
const companies = Object.keys(byCompany).sort((a,b)=>byCompany[b].length-byCompany[a].length);
let md = `# 非上市公司情报汇总（豆包联网搜索，实时拉取自云端）\n\n`;
md += `- 生成时间：${new Date().toISOString()}\n`;
md += `- 已写入公司数：${companies.length}\n`;
md += `- 已校验可信来源总数：${items.length}\n\n`;
md += `## 各公司搜到条数\n\n`;
md += `| 公司 | 条数 |\n|---|---|\n`;
for (const c of companies) md += `| ${c} | ${byCompany[c].length} |\n`;
md += `\n## 明细（每家公司前 5 条）\n\n`;
for (const c of companies) {
  md += `### ${c}（${byCompany[c].length} 条）\n\n`;
  for (const it of byCompany[c].slice(0,5)) {
    md += `- [${it.title}](${it.url}) — ${it.source || ''} ${it.publishedAt ? '· ' + it.publishedAt.slice(0,10) : ''}\n`;
  }
  md += `\n`;
}
writeFileSync('/Users/z1/Documents/New project/ai_web/nonlisted_summary.md', md);
console.log('companies:', companies.length, 'total items:', items.length);
console.log(companies.map(c => `${c}=${byCompany[c].length}`).join('\n'));
