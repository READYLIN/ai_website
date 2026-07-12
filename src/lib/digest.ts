import { Article } from './types';

export interface DigestBuildResult {
  subject: string;
  body: string;
}

// ─── Minimalist tech palette ─────────────────────────────────
const C = {
  bg:       '#0a0a0b',
  surface:  '#111113',
  raised:   '#18181b',
  border:   '#252529',
  text:     '#f4f4f5',
  body:     '#a1a1aa',
  muted:    '#71717a',
  faint:    '#3f3f46',
  accent:   '#ffffff',
  link:     '#a78bfa',    // soft violet — single accent
  pillBg:   '#18181b',
  pillText: '#a1a1aa',
};

// ─── Helpers ─────────────────────────────────────────────────

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip HTML tags AND escape — produces clean plain text safe for email. */
function clean(s: string, max?: number): string {
  const stripped = (s || '').replace(/<[^>]+>/g, '');
  const text = stripped.replace(/\s+/g, ' ').trim();
  const truncated = max && text.length > max ? text.slice(0, max) + '…' : text;
  return esc(truncated);
}

function todayCN(): string {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

function beijingTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const bj = new Date(d.getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(bj.getUTCMonth() + 1)}-${p(bj.getUTCDate())} ${p(bj.getUTCHours())}:${p(bj.getUTCMinutes())}`;
}

// ─── Components ──────────────────────────────────────────────

function articleRow(a: Article, idx: number): string {
  const title   = clean(a.titleZh || a.title);
  const source  = clean(a.source || '');
  const cats    = (a.categories || []).filter(c => c !== '传媒监控').slice(0, 2);
  const catStr  = cats.map(c => clean(c)).join('  ');
  const time    = beijingTime(a.publishedAt);
  const url     = esc(a.url || '');
  const desc    = clean(a.descriptionZh || a.description || '', 200);

  // Source pill
  const pills = [source, catStr].filter(Boolean).map(t =>
    `<span style="display:inline-block;padding:3px 8px;margin-right:6px;margin-bottom:4px;font-size:11px;line-height:1.4;color:${C.pillText};background:${C.pillBg};border-radius:4px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">${t}</span>`
  ).join('');

  const descBlock = desc
    ? `<p style="margin:0 0 0 0;font-size:13px;line-height:1.7;color:${C.body};">${desc}</p>`
    : '';

  return `
      <tr>
        <td style="padding:0 0 32px 0;">

          <!-- Top rule except first item -->
          ${idx > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td style="border-top:1px solid ${C.border};"></td></tr></table>` : ''}

          <!-- Meta -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
            <tr>
              <td>
                ${pills}
                <span style="display:inline-block;font-size:11px;color:${C.muted};vertical-align:middle;font-family:'SF Mono','JetBrains Mono','Menlo',monospace;">${time}</span>
              </td>
            </tr>
          </table>

          <!-- Title -->
          <a href="${url}" target="_blank"
             style="display:block;margin-bottom:${desc ? '10px' : '0'};text-decoration:none;color:${C.text};font-size:16px;font-weight:600;line-height:1.55;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:-0.01em;">
            ${title}
          </a>

          ${descBlock}

          <!-- Arrow link -->
          <a href="${url}" target="_blank"
             style="display:inline-block;margin-top:12px;font-size:12px;font-weight:500;color:${C.link};text-decoration:none;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:0.02em;">
            Read &rarr;
          </a>

        </td>
      </tr>`;
}

function sectionHead(label: string, count: number): string {
  return `
      <tr>
        <td style="padding:0 0 24px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;font-weight:600;letter-spacing:0.08em;color:${C.muted};text-transform:uppercase;font-family:'SF Mono','JetBrains Mono','Menlo',monospace;">
                  ${esc(label)}
                </span>
                <span style="display:inline-block;margin-left:8px;font-size:11px;color:${C.faint};font-family:'SF Mono','JetBrains Mono','Menlo',monospace;">
                  ${count}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
}

// ─── Main ────────────────────────────────────────────────────

export function buildDigest(articles: Article[]): DigestBuildResult {
  const news   = articles.filter(a => !a.categories.includes('论文'));
  const papers = articles.filter(a => a.categories.includes('论文'));
  const date   = todayCN();
  const total  = articles.length;

  const body = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge" /><!--<![endif]-->
  <title>AI Daily</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 48px 16px;">

        <!-- ═══ WRAPPER ═══ -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:${C.surface};border:1px solid ${C.border};border-radius:1px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="padding:40px 40px 0 40px;">

              <!-- Dot + brand -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td width="6" height="6" style="width:6px;height:6px;background:${C.link};border-radius:50%;"></td>
                  <td style="padding-left:10px;font-size:12px;font-weight:600;letter-spacing:0.06em;color:${C.text};font-family:'SF Mono','JetBrains Mono','Menlo',monospace;">
                    AI DAILY
                  </td>
                </tr>
              </table>

              <!-- Date + count -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="font-size:13px;line-height:1.6;color:${C.body};font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
                    ${esc(date)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:28px;font-weight:700;color:${C.text};line-height:1.2;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;letter-spacing:-0.02em;">
                      ${total}
                    </span>
                    <span style="font-size:14px;font-weight:400;color:${C.muted};padding-left:8px;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
                      articles today
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Full-width rule -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
                <tr>
                  <td style="border-top:1px solid ${C.border};"></td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:36px 40px 0 40px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                ${news.length > 0 ? sectionHead('News', news.length) + news.map((a, i) => articleRow(a, i)).join('') : ''}

                ${papers.length > 0 ? sectionHead('Papers', papers.length) + papers.map((a, i) => articleRow(a, i)).join('') : ''}

              </table>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:20px 40px 36px 40px;">

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid ${C.border};padding-top:20px;">
                    <p style="margin:0 0 8px 0;font-size:11px;line-height:1.7;color:${C.faint};font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
                      You received this email because you subscribed to AI Daily.
                    </p>
                    <p style="margin:0;font-size:11px;line-height:1.7;color:${C.faint};font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
                      Reply <span style="color:${C.muted};">stop</span> to unsubscribe &nbsp;·&nbsp;
                      <a href="https://aiweb-roan.vercel.app" target="_blank" style="color:${C.muted};text-decoration:none;">aiweb-roan.vercel.app</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `AI Daily · ${date} · ${total} articles`;

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