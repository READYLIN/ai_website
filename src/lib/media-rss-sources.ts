import { RSSSource } from './types';
import monitorConfig from '../../data/intelligence-entities.json';
import { nonListedRssSources } from './non-listed-companies';

const existingMediaSources: RSSSource[] = [
  // Official RSS
  {
    name: '人民网传媒频道',
    url: 'http://www.people.com.cn/rss/media.xml',
    icon: '🏛️',
    category: 'chinese',
  },
  {
    name: '人民网时政',
    url: 'http://www.people.com.cn/rss/politics.xml',
    icon: '🏛️',
    category: 'chinese',
  },
  // RSSHub routes
  {
    name: '央视新闻',
    url: 'https://rsshub.app/cctv/news',
    icon: '📺',
    category: 'chinese',
  },
  {
    name: '央视国内',
    url: 'https://rsshub.app/cctv/china',
    icon: '📺',
    category: 'chinese',
  },
  {
    name: '央视国际',
    url: 'https://rsshub.app/cctv/world',
    icon: '📺',
    category: 'chinese',
  },
  {
    name: '央视科技',
    url: 'https://rsshub.app/cctv/tech',
    icon: '📺',
    category: 'chinese',
  },
  {
    name: '羊城晚报要闻',
    url: 'https://rsshub.app/ycwb/22',
    icon: '📰',
    category: 'chinese',
  },
  {
    name: '羊城晚报广州',
    url: 'https://rsshub.app/ycwb/18',
    icon: '📰',
    category: 'chinese',
  },
  {
    name: '羊城晚报广东政经',
    url: 'https://rsshub.app/ycwb/13074',
    icon: '📰',
    category: 'chinese',
  },
  {
    name: '证券时报要闻',
    url: 'https://rsshub.app/stcn/article/list/yw',
    icon: '💹',
    category: 'chinese',
  },
  {
    name: '证券时报股市',
    url: 'https://rsshub.app/stcn/article/list/gs',
    icon: '💹',
    category: 'chinese',
  },
  {
    name: '证券时报公司',
    url: 'https://rsshub.app/stcn/article/list/company',
    icon: '💹',
    category: 'chinese',
  },
  {
    name: '证券时报金融',
    url: 'https://rsshub.app/stcn/article/list/finance',
    icon: '💹',
    category: 'chinese',
  },
  // SZSE stock announcements
  {
    name: '粤传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=002181',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '华媒控股',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000607',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '中原传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000719',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '华数传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000156',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '新媒股份',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=300770',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '海看股份',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=301262',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '电广传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000917',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '天威视讯',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=002238',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '湖北广电',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000665',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '分众传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=002027',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '兆讯传媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=301102',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '省广集团',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=002400',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '芒果超媒',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=300413',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '蓝色光标',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=300058',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '利欧股份',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=002131',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '智度股份',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=000676',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '每日互动',
    url: 'https://rsshub.app/szse/disclosure/listed/notice/stock=300766',
    icon: '📋',
    category: 'chinese',
  },
  // SSE stock announcements
  {
    name: '浙数文化',
    url: 'https://rsshub.app/sse/disclosure/productId=600633',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '新华传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=600825',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '博瑞传播',
    url: 'https://rsshub.app/sse/disclosure/productId=600880',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '中文传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=600373',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '读者传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=603999',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '东方明珠',
    url: 'https://rsshub.app/sse/disclosure/productId=600637',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '江苏有线',
    url: 'https://rsshub.app/sse/disclosure/productId=600959',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '歌华有线',
    url: 'https://rsshub.app/sse/disclosure/productId=600037',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '吉视传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=601929',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '北巴传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=600386',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '人民网',
    url: 'https://rsshub.app/sse/disclosure/productId=603000',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '新华网',
    url: 'https://rsshub.app/sse/disclosure/productId=603888',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '浙文互联',
    url: 'https://rsshub.app/sse/disclosure/productId=600986',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '三人行',
    url: 'https://rsshub.app/sse/disclosure/productId=605168',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '引力传媒',
    url: 'https://rsshub.app/sse/disclosure/productId=603598',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '天下秀',
    url: 'https://rsshub.app/sse/disclosure/productId=600556',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '龙韵股份',
    url: 'https://rsshub.app/sse/disclosure/productId=603729',
    icon: '📋',
    category: 'chinese',
  },
];

// Missing sources shared by media_weekly_automation. The two routes already in
// existingMediaSources stay there so the merged list has no duplicate entries.
const weeklyAutomationSources: RSSSource[] = [
  {
    name: '财联社电报',
    url: 'https://rsshub.rssforever.com/cls/telegraph',
    icon: '⚡',
    category: 'chinese',
  },
  {
    name: '新浪财经滚动',
    url: 'https://rsshub.rssforever.com/sina/finance/rollnews',
    icon: '💹',
    category: 'chinese',
  },
  {
    name: '36氪',
    url: 'https://36kr.com/feed',
    icon: '💡',
    category: 'chinese',
  },
  {
    name: '第一财经',
    url: 'https://rsshub.rssforever.com/yicai/news',
    icon: '📰',
    category: 'chinese',
  },
  {
    name: '华尔街见闻实时',
    url: 'https://rsshub.rssforever.com/wallstreetcn/live',
    icon: '🌐',
    category: 'chinese',
  },
  {
    name: '人民网财经',
    url: 'https://rsshub.rssforever.com/people/finance',
    icon: '🏛️',
    category: 'chinese',
  },
  {
    name: '上交所公告',
    url: 'https://rsshub.rssforever.com/sse/disclosure',
    icon: '📋',
    category: 'chinese',
  },
  {
    name: '深交所公告',
    url: 'https://rsshub.rssforever.com/szse/disclosure/listed/notice',
    icon: '📋',
    category: 'chinese',
  },
];

// 非上市公司「情报覆盖」新鲜源（2026-07-20 逐个实测新鲜度后接入）。
// 说明：这 37 家非上市媒体集团的官方 RSS 已全部废弃/死链（实测 /rss/ 均 404/403/返回 HTML，
// 仅人民网官方源可响应但停更 14 个月）。唯一可行的自动更新机制是 RSSHub。以下 4 条旗舰媒体
// 路由经镜像实测「存在且新鲜」（近 1-3 天有内容），作为通用新闻池 —— 由 non-listed-search
// 的「标题/正文提及检索」去命中 37 家中被报道的公司。这里刻意用中性媒体名（非集团名），
// 避免来源名污染公司标签。
const freshNewsSources: RSSSource[] = [
  { name: '澎湃新闻头条', url: 'https://rsshub.app/thepaper/featured', icon: '📰', category: 'chinese' },
  { name: '财新网最新', url: 'https://rsshub.app/caixin/latest', icon: '📰', category: 'chinese' },
  { name: '南方周末', url: 'https://rsshub.app/infzm/1', icon: '📰', category: 'chinese' },
  { name: '浙江日报', url: 'https://rsshub.app/zjol/paper/zjrb', icon: '📰', category: 'chinese' },
];

const configuredMediaSources: RSSSource[] = monitorConfig.mediaRssSources.map(source => ({
  name: source.name,
  url: source.url,
  icon: source.name.includes('巨潮') ? '📋' : '📰',
  category: 'chinese',
}));

function logicalSourceKey(source: RSSSource): string {
  try {
    const url = new URL(source.url);
    return url.hostname.startsWith('rsshub.') ? `${url.pathname}${url.search}` : url.href;
  } catch {
    return source.url;
  }
}

export const mediaSources: RSSSource[] = Array.from(
  new Map(
    [
      ...existingMediaSources,
      ...freshNewsSources,
      ...configuredMediaSources,
      ...weeklyAutomationSources,
      ...nonListedRssSources(),
    ]
      .map(source => [logicalSourceKey(source), source]),
  ).values(),
);
