import { Article, IntelArticle } from './types';
import { NEWSLETTER_TOPIC_META, NewsletterTopic } from './newsletter';

export interface DigestBuildResult {
  subject: string;
  body: string;
}

interface DigestItem {
  title: string;
  description: string;
  url: string;
  source: string;
  categories: string[];
  publishedAt: string;
  priority?: string;
  company?: string;
}

const C = {
  bg: '#f1eee6',
  surface: '#fffdf8',
  raised: '#f7f3ea',
  border: '#ded8ca',
  text: '#1f1e1c',
  body: '#4d4942',
  muted: '#736c5f',
  faint: '#9a9285',
  accent: '#b54e2e',
  accentSoft: '#f4e4dc',
};

function esc(value: string): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clean(value: string, max?: number): string {
  const text = (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return esc(max && text.length > max ? `${text.slice(0, max)}…` : text);
}

function todayCN(): string {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Shanghai',
  });
}

function beijingTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).format(date).replace(/\//g, '-');
}

function articleRow(item: DigestItem, index: number): string {
  const title = clean(item.title);
  const description = clean(item.description, 180);
  const url = esc(item.url || 'https://aiweb-roan.vercel.app');
  const labels = [item.company, item.source, item.priority, ...item.categories]
    .filter(Boolean)
    .filter((value, idx, values) => values.indexOf(value) === idx)
    .slice(0, 3) as string[];

  const pills = labels.map((label, labelIndex) => (
    `<span style="display:inline-block;padding:4px 8px;margin:0 6px 5px 0;font-size:11px;line-height:1.35;color:${labelIndex === 0 ? C.accent : C.muted};background:${labelIndex === 0 ? C.accentSoft : C.raised};border-radius:4px;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">${clean(label)}</span>`
  )).join('');

  return `
    <tr>
      <td style="padding:0 0 28px 0;">
        ${index > 0 ? `<div style="height:1px;background:${C.border};margin:0 0 26px 0;font-size:0;line-height:0;">&nbsp;</div>` : ''}
        <div style="margin:0 0 9px 0;">${pills}<span style="display:inline-block;padding:4px 0 5px;font-size:11px;color:${C.faint};vertical-align:top;font-family:'SFMono-Regular','Menlo','Consolas',monospace;">${beijingTime(item.publishedAt)}</span></div>
        <a class="email-title" href="${url}" target="_blank" style="display:block;margin:0 0 ${description ? '9px' : '0'} 0;text-decoration:none;color:${C.text};font-size:18px;font-weight:650;line-height:1.48;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:-0.012em;">${title}</a>
        ${description ? `<p class="email-description" style="margin:0;font-size:14px;line-height:1.75;color:${C.body};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">${description}</p>` : ''}
        <a href="${url}" target="_blank" style="display:inline-block;margin-top:13px;padding:3px 0;font-size:12px;font-weight:600;color:${C.accent};text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">查看原文&nbsp; →</a>
      </td>
    </tr>`;
}

function sectionHead(label: string, count: number): string {
  return `
    <tr>
      <td style="padding:0 0 22px 0;">
        <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:${C.muted};font-family:'SFMono-Regular','Menlo','Consolas',monospace;">${esc(label)}</span>
        <span style="display:inline-block;margin-left:8px;font-size:11px;color:${C.faint};font-family:'SFMono-Regular','Menlo','Consolas',monospace;">${count}</span>
      </td>
    </tr>`;
}

function buildDocument(
  topic: NewsletterTopic,
  sections: { label: string; items: DigestItem[] }[],
): DigestBuildResult {
  const meta = NEWSLETTER_TOPIC_META[topic];
  const date = todayCN();
  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const rows = sections
    .filter((section) => section.items.length > 0)
    .map((section) => sectionHead(section.label, section.items.length)
      + section.items.map(articleRow).join(''))
    .join('');

  const body = `<!-- buttondown-editor-mode: fancy -->
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${esc(meta.label)}简报</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    table { border-collapse: collapse !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 620px) {
      .email-outer { padding: 10px 6px 24px !important; }
      .email-shell { width: 100% !important; border-left: 0 !important; border-right: 0 !important; }
      .email-pad { padding-left: 20px !important; padding-right: 20px !important; }
      .email-header { padding-top: 26px !important; }
      .email-body { padding-top: 28px !important; }
      .email-title { font-size: 19px !important; line-height: 1.5 !important; }
      .email-description { font-size: 15px !important; line-height: 1.72 !important; }
      .email-total { font-size: 31px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:${C.bg};">
    <tr>
      <td class="email-outer" align="center" style="padding:30px 14px 42px;">
        <table class="email-shell" role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:${C.surface};border:1px solid ${C.border};">
          <tr>
            <td class="email-pad email-header" style="padding:38px 38px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:30px;">
                    <span style="display:inline-block;width:7px;height:7px;margin-right:9px;background:${C.accent};border-radius:50%;vertical-align:1px;"></span>
                    <span style="font-size:12px;font-weight:700;letter-spacing:0.08em;color:${C.text};font-family:'SFMono-Regular','Menlo','Consolas',monospace;">新闻中心 · ${esc(meta.shortLabel)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:14px;line-height:1.6;color:${C.muted};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">${esc(date)}</td>
                </tr>
                <tr>
                  <td style="padding:5px 0 26px;">
                    <span class="email-total" style="font-size:36px;font-weight:750;color:${C.text};line-height:1.2;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:-0.03em;">${total}</span>
                    <span style="padding-left:9px;font-size:14px;color:${C.muted};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">条今日更新</span>
                  </td>
                </tr>
                <tr><td style="border-top:1px solid ${C.border};font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad email-body" style="padding:34px 38px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:12px 38px 32px;">
              <div style="border-top:1px solid ${C.border};padding-top:20px;">
                <p style="margin:0 0 7px;font-size:11px;line-height:1.7;color:${C.faint};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">你收到这封邮件，是因为订阅了新闻中心的「${esc(meta.label)}」。</p>
                <p style="margin:0;font-size:11px;line-height:1.7;color:${C.faint};font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;">
                  <a href="{{ unsubscribe_url }}" style="color:${C.muted};text-decoration:underline;text-underline-offset:3px;">退订邮件</a>&nbsp;&nbsp;·&nbsp;&nbsp;
                  <a href="https://aiweb-roan.vercel.app" target="_blank" style="color:${C.muted};text-decoration:none;">访问新闻中心</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `新闻中心 · ${meta.label} · ${date} · ${total} 条`,
    body,
  };
}

export function buildDigest(articles: Article[]): DigestBuildResult {
  const news = articles.filter((article) => !article.categories.includes('论文')).slice(0, 16);
  const papers = articles.filter((article) => article.categories.includes('论文')).slice(0, 8);
  const toItem = (article: Article): DigestItem => ({
    title: article.titleZh || article.title,
    description: article.descriptionZh || article.description,
    url: article.url,
    source: article.source,
    categories: article.categories.filter((category) => category !== '传媒监控'),
    publishedAt: article.publishedAt,
  });

  return buildDocument('ai', [
    { label: 'AI 资讯', items: news.map(toItem) },
    { label: '前沿论文', items: papers.map(toItem) },
  ]);
}

export function buildIntelligenceDigest(
  topic: Exclude<NewsletterTopic, 'ai'>,
  articles: IntelArticle[],
): DigestBuildResult {
  const items = articles.slice(0, 20).map((article): DigestItem => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source,
    categories: article.categories,
    publishedAt: article.publishedAt,
    priority: article.priority,
    company: article.company,
  }));

  return buildDocument(topic, [{
    label: topic === 'media' ? '传媒经营动态' : '私募股权动态',
    items,
  }]);
}

export function filterLast24Hours<T extends { publishedAt: string }>(items: T[]): T[] {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    const timestamp = new Date(item.publishedAt).getTime();
    return timestamp >= cutoff && timestamp <= now;
  });
}
