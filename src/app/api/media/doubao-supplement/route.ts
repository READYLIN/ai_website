import { NextRequest, NextResponse } from 'next/server';
import { runDoubaoCompanySearch } from '@/lib/doubao-search';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get('company')?.trim();
  if (!company) {
    return NextResponse.json({ error: '缺少 company 参数' }, { status: 400 });
  }

  const result = await runDoubaoCompanySearch(company);
  if (result.errors.length && result.verified === 0) {
    return NextResponse.json(
      { company: result.company, error: result.errors.join('; ') },
      { status: 502 },
    );
  }
  return NextResponse.json({
    company: result.company,
    total: result.total,
    verified: result.verified,
    rejected: result.rejected,
    message:
      result.verified > 0
        ? `已校验通过 ${result.verified} 条来源可访问的资讯。`
        : '豆包未返回任何可核验信源，请稍后重试或调整检索范围。',
    articles: result.articles,
  });
}
