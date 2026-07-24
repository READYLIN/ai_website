import { NextResponse } from 'next/server';
import { generateCustomArticle } from '@/lib/article-generator/service';
import { getArticleGeneratorConfig } from '@/lib/article-generator/config';
import { getMarketSnapshot, buildMarketEvidence, buildMarketTopic } from '@/lib/market-data';
import type { ArticleStyle, GenerateOptions } from '@/lib/article-generator/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const STYLES: ArticleStyle[] = ['objective', 'financial_media', 'guangzhou_local', 'investment_brief'];

/** GET /api/generated-articles/market-overview
 *  仅预览大盘数据（不消耗模型调用）：指数快照 + 涨跌家数。 */
export async function GET() {
  try {
    const snap = await getMarketSnapshot();
    return NextResponse.json({
      ok: true,
      date: snap.date,
      time: snap.time,
      topic: buildMarketTopic(snap.date),
      indices: snap.indices,
      breadth: snap.breadth,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/** POST /api/generated-articles/market-overview
 *  抓取大盘数据 → 构造库外证据 → 复用铸闻管线（Fact Sheet→生成→逐句核查→落库），
 *  稿件类型为「大盘综述」（market_overview）。 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const snap = await getMarketSnapshot();
    const evidenceItems = buildMarketEvidence(snap);
    const topic = buildMarketTopic(snap.date);

    const cfg = getArticleGeneratorConfig();
    const options: GenerateOptions = {
      articleType: 'market_overview',
      targetLength: Math.min(cfg.maxTargetLength, Math.max(100, Number(body?.targetLength) || cfg.defaultTargetLength)),
      style: STYLES.includes(body?.style) ? body.style : 'financial_media',
      includeBackground: true,
      includeRiskNotes: true,
      includeAlternativeTitles: true,
      includeLead: true,
      includeSource: true,
    };

    const result = await generateCustomArticle({ topic, evidenceItems, options });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      id: result.article.id,
      source: result.source,
      modelName: result.modelName,
      verificationStatus: result.article.verificationStatus,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
