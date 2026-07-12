import { Article } from './types';

export interface DigestBuildResult {
  subject: string;
  body: string;
}

// ─── Brand palette (synced with tailwind.config.ts) ──────────
const COLOR = {
  // Accent: clay/terracotta — warm, distinctive, matches site
  accent:        '#B54E2E',
  accentHover:   '#9A3F22',
  accentSoft:    '#FFF5F0',

  // Warm paper palette
  bg:            '#FAF9F5',
  bgAlt:         '#F5F2EB',
  card:          '#FFFFFF',
  cardBorder:    '#EBE7DE',

  // Type colors
  heading:       '#1F1E1C',
  body:          '#3D3833',
  muted:         '#736C5F',
  faint:         '#A0988A',

  // Dividers
  rule:          '#E8E4DA',
  ruleLight:     '#F0EDE5',

  // On-dark
  white:         '#FFFFFF',
  whiteMuted:    'rgba(255,255,255,0.82)',
};

// ─── Helpers ─────────────────────────────────────────────────

/** Escape ONLY HTML special characters. Leave Chinese/Unicode intact. */
function esc(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayCN(): string {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

/** ISO → Beijing time "MM-DD HH:mm" */
function beijingTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const bj = new Date(d.getTime() + 8 * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}`;
}

/** Clean snippet: strip HTML, take first N chars, add ellipsis. */
function snippet(article: Article, max: number): string {
  const raw = article.descriptionZh || article.description || '';
  const plain = raw.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (plain.length <= max) return esc(plain);
  return esc(plain.slice(0, max)) + '…';
}

// ─── Card builder ────────────────────────────────────────────

function articleCard(article: Article): string {
  const title    = esc(article.titleZh || article.title);
  const source   = esc(article.source || '');
  const category = esc(
    (article.categories || [])
      .filter(c => c !== '传媒监控')
      .slice(0, 3)
      .join(' · ')
  );
  const time     = beijingTime(article.publishedAt);
  const url      = esc(article.url || '');
  const desc     = snippet(article, 300);
  const img      = article.imageUrl ? esc(article.imageUrl) : '';

  // Meta line: source · category · time
  const metaParts = [source, category, time].filter(Boolean);
  const metaLine  = metaParts.join(' &nbsp;·&nbsp; ');

  // Optional image block
  const imgBlock = img
    ? `
                    <!-- Thumbnail -->
                    <td width="100" style="width:100px;vertical-align:top;padding-left:20px;">
                      <img src="${img}" width="100" height="100" alt=""
                           style="display:block;width:100px;height:100px;border-radius:10px;object-fit:cover;border:1px solid ${COLOR.ruleLight};" />
                    </td>`
    : '';

  const descBlock = desc
    ? `
                    <p style="margin:10px 0 0 0;font-size:15px;line-height:1.72;color:${COLOR.body};">
                      ${desc}
                    </p>`
    : '';

  return `
      <!-- Article Card -->
      <tr>
        <td style="padding:0 0 28px 0;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:${COLOR.card};border:1px solid ${COLOR.cardBorder};border-radius:12px;">
            <tr>
              <td style="padding:22px 22px 20px 22px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>

                    <!-- Text column -->
                    <td valign="top" style="${img ? 'padding-right:20px;' : ''}">

                      <!-- Meta line -->
                      <p style="margin:0 0 10px 0;font-size:12px;line-height:1.5;color:${COLOR.muted};letter-spacing:0.03em;">
                        ${metaLine}
                      </p>

                      <!-- Title -->
                      <a href="${url}" target="_blank"
                         style="display:block;text-decoration:none;color:${COLOR.heading};font-size:18px;font-weight:700;line-height:1.45;font-family:Georgia,'Songti SC','Noto Serif CJK SC',serif;">
                        ${title}
                      </a>
${descBlock}
                      <!-- CTA -->
                      <a href="${url}" target="_blank"
                         style="display:inline-block;margin-top:14px;padding:8px 18px;font-size:13px;font-weight:600;line-height:1.4;color:${COLOR.white};background:${COLOR.accent};border-radius:7px;text-decoration:none;">
                        阅读原文 &rarr;
                      </a>
                    </td>
${imgBlock}
                  </tr>
                </table>

              </td>
            </tr>
          </table>

        </td>
      </tr>`;
}

function sectionDivider(): string {
  return `
      <tr>
        <td style="padding:4px 0 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-top:1px solid ${COLOR.rule};"></td>
            </tr>
          </table>
        </td>
      </tr>`;
}

function sectionHeader(title: string, count: number): string {
  return `
      <tr>
        <td style="padding:0 0 20px 0;">
          <h2 style="margin:0;font-size:20px;font-weight:700;color:${COLOR.heading};font-family:Georgia,'Songti SC','Noto Serif CJK SC',serif;line-height:1.3;">
            ${esc(title)}
            <span style="font-size:14px;font-weight:400;color:${COLOR.muted};margin-left:6px;">${count} 篇</span>
          </h2>
        </td>
      </tr>`;
}

// ─── Main builder ────────────────────────────────────────────

export function buildDigest(articles: Article[]): DigestBuildResult {
  const news   = articles.filter(a => !a.categories.includes('论文'));
  const papers = articles.filter(a => a.categories.includes('论文'));
  const date   = todayCN();
  const total  = articles.length;

  const newsCards   = news.map(articleCard).join('\n');
  const paperCards  = papers.map(articleCard).join('\n');

  const body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--<![endif]-->
  <title>AI 新闻日报</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};">
    <tr>
      <td align="center" style="padding:32px 16px 40px 16px;">

        <!-- ── Outer wrapper (600px) ── -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:${COLOR.card};border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">

          <!-- ═══════ HEADER ═══════ -->
          <tr>
            <td style="background:${COLOR.accent};padding:36px 32px 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Brand badge row -->
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:${COLOR.white};border-radius:8px;padding:7px 12px;">
                          <span style="font-size:15px;font-weight:800;color:${COLOR.accent};letter-spacing:0.06em;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">AI</span>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-size:17px;font-weight:700;color:${COLOR.white};letter-spacing:0.02em;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">新闻中心</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Headline -->
                <tr>
                  <td style="padding-top:18px;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:${COLOR.white};line-height:1.25;font-family:Georgia,'Songti SC','Noto Serif CJK SC',serif;">
                      AI 新闻日报
                    </h1>
                  </td>
                </tr>

                <!-- Date + count -->
                <tr>
                  <td style="padding-top:8px;">
                    <p style="margin:0;font-size:14px;color:${COLOR.whiteMuted};line-height:1.5;">
                      ${esc(date)} &nbsp;·&nbsp; 共 <strong style="color:${COLOR.white};font-weight:700;">${total}</strong> 篇精选内容
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ═══════ BODY ═══════ -->
          <tr>
            <td style="padding:28px 32px;background:${COLOR.bgAlt};">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                <!-- Intro -->
                <tr>
                  <td style="padding:0 0 28px 0;">
                    <p style="margin:0;font-size:14px;line-height:1.65;color:${COLOR.body};">
                      早上好 ☀️&nbsp; 以下是过去 24 小时内值得关注的 AI 资讯与前沿论文，按发布时间排列。
                    </p>
                  </td>
                </tr>

                <!-- ── AI 资讯 Section ── -->
                ${news.length > 0 ? sectionHeader('📰 AI 资讯', news.length) + newsCards + sectionDivider() : ''}

                <!-- ── 论文精选 Section ── -->
                ${papers.length > 0 ? sectionHeader('📄 论文精选', papers.length) + paperCards + '' : ''}

              </table>

            </td>
          </tr>

          <!-- ═══════ FOOTER ═══════ -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid ${COLOR.rule};background:${COLOR.accentSoft};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:8px;">
                    <p style="margin:0;font-size:12px;line-height:1.7;color:${COLOR.muted};">
                      共 <strong style="color:${COLOR.heading};">${total}</strong> 篇内容 &nbsp;·&nbsp; 由 AI 新闻中心自动整理发送
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;font-size:12px;line-height:1.7;color:${COLOR.faint};">
                      你收到这封邮件是因为订阅了 AI 新闻中心日报。
                      <br/>如需退订，请直接回复 <strong style="color:${COLOR.muted};">stop</strong>。
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- ── Copyright line ── -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:20px 0 0 0;">
              <p style="margin:0;font-size:11px;color:${COLOR.faint};line-height:1.5;">
                &copy; AI 新闻中心 &nbsp;·&nbsp;
                <a href="https://aiweb-roan.vercel.app" target="_blank"
                   style="color:${COLOR.muted};text-decoration:underline;">aiweb-roan.vercel.app</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `📰 AI 日报 · ${date} · ${total} 篇`;

  return { subject, body };
}

// ─── 24h filter ──────────────────────────────────────────────

export function filterLast24Hours(articles: Article[]): Article[] {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  return articles.filter(a => {
    const t = new Date(a.publishedAt).getTime();
    return t >= cutoff && t <= now;
  });
}