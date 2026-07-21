import { RSSSource } from './types';

export interface NonListedCompany {
  name: string;
  aliases: string[];
  website?: string;
  rss?: string;
  rsshub?: string;
  note?: string;
}

// 名单来源：media_weekly_automation/config.json 中 market=private/state 的全部非上市主体（去重后 37 家）
export const nonListedCompanies: NonListedCompany[] = [
  { name: '新潮传媒', aliases: ["新潮传媒"], note: '非上市媒体/内容机构' },
  { name: '中央广播电视总台', aliases: ["总台", "央视", "CMG"], note: '非上市媒体/内容机构' },
  { name: '南方报业传媒集团', aliases: ["南方报业"], note: '未上市地方媒体集团' },
  { name: '上海报业集团', aliases: ["上海报业"], note: '未上市地方媒体集团' },
  { name: '成都传媒集团', aliases: ["成都传媒"], note: '未上市地方媒体集团' },
  { name: '大众报业集团', aliases: ["大众报业"], note: '未上市地方媒体集团' },
  { name: '长江传媒', aliases: ["长江传媒"], note: '未上市地方媒体集团' },
  { name: '浙江日报报业集团', aliases: ["浙报", "浙江日报"], note: '未上市地方媒体集团' },
  { name: '深圳报业集团', aliases: ["深圳报业"], note: '未上市地方媒体集团' },
  { name: '河南广电网络', aliases: ["河南广电"], note: '未上市地方媒体集团' },
  { name: '西安报业传媒集团', aliases: ["西安报业"], note: '未上市地方媒体集团' },
  { name: '重庆日报报业集团', aliases: ["重庆日报"], note: '未上市地方媒体集团' },
  { name: '四川日报报业集团', aliases: ["四川日报"], note: '未上市地方媒体集团' },
  { name: '湖南日报报业集团', aliases: ["湖南日报"], note: '未上市地方媒体集团' },
  { name: '湖北日报传媒集团', aliases: ["湖北日报"], note: '未上市地方媒体集团' },
  { name: '安徽日报报业集团', aliases: ["安徽日报"], note: '未上市地方媒体集团' },
  { name: '辽宁报刊传媒集团', aliases: ["辽宁报刊"], note: '未上市地方媒体集团' },
  { name: '贵州日报报刊社', aliases: ["贵州日报"], note: '未上市地方媒体集团' },
  { name: '广西日报传媒集团', aliases: ["广西日报"], note: '未上市地方媒体集团' },
  { name: '北京日报报业集团', aliases: ["北京日报"], note: '未上市地方媒体集团' },
  { name: '羊城晚报报业集团', aliases: ["羊城晚报"], note: '未上市地方媒体集团' },
  { name: '深圳广电集团', aliases: ["深圳广电"], note: '未上市地方媒体集团' },
  { name: '长江日报报业集团', aliases: ["长江日报"], note: '未上市地方媒体集团' },
  { name: '苏州日报报业集团', aliases: ["苏州报业"], note: '未上市地方媒体集团' },
  { name: '南京报业传媒集团', aliases: ["南京报业"], note: '未上市地方媒体集团' },
  { name: '天津海河传媒中心', aliases: ["海河传媒"], note: '未上市地方媒体集团' },
  { name: '郑州报业集团', aliases: ["郑州报业"], note: '未上市地方媒体集团' },
  { name: '东莞报业传媒集团', aliases: ["东莞报业"], note: '未上市地方媒体集团' },
  { name: '青岛报业传媒集团', aliases: ["青岛报业"], note: '未上市地方媒体集团' },
  { name: '昆明报业传媒集团', aliases: ["昆明报业"], note: '未上市地方媒体集团' },
  { name: '宁波日报报业集团', aliases: ["宁波日报"], note: '未上市地方媒体集团' },
  { name: '合肥报业传媒集团', aliases: ["合肥报业"], note: '未上市地方媒体集团' },
  { name: '正午阳光', aliases: ["东阳正午阳光影视有限公司"], website: 'https://www.zhengwuyg.com', note: '《琅琊榜》《山海情》《大江大河》制作方，国产剧天花板，未上市' },
  { name: '柠萌影业', aliases: ["柠萌影视"], website: 'https://www.liningfilm.com', note: '头部剧集公司，未上市' },
  { name: '耀客传媒', aliases: ["上海耀客文化传媒有限公司"], website: 'https://www.yaok.com.cn', note: '头部剧集公司，未上市' },
  { name: '华人文化集团', aliases: ["CMC", "华人文化集团(CMC)", "华人文化集团（CMC）"], website: 'https://www.cmcholdings.com', note: '华人文化集团（CMC），黎瑞刚操盘，内容+文旅+体育投资巨头，未上市' },
  { name: '财新传媒', aliases: ["财新"], website: 'https://www.caixin.com', note: '最权威的财经媒体之一，深度调查标杆，未上市' },
];

export function nonListedRssSources(): RSSSource[] {
  return nonListedCompanies
    .filter((c) => c.rss || c.rsshub)
    .map((c) => ({ name: c.name, url: (c.rss || c.rsshub) as string, icon: '🏢', category: 'chinese' as const }));
}

export function makeQueriesForCompany(name: string): string[] {
  const comp = nonListedCompanies.find((c) => c.name === name || c.aliases.includes(name));
  const identity = comp?.name || name;
  return [
    `${identity} 业绩 营收 净利润 融资 股权交易 重组 收购 并购`,
    `${identity} 中标 订单 客户 经营 业务 战略合作 项目落地`,
    `${identity} AI AIGC 数字化 大模型 产品 技术 业务转型`,
    `${identity} 对外投资 并购 基金 生态合作 新业务；排除董监高 股东会 董事会 换届`,
  ];
}

export function findNonListedCompany(name: string): NonListedCompany | undefined {
  return nonListedCompanies.find((c) => c.name === name || c.aliases.includes(name));
}