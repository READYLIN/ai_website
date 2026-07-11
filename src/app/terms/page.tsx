import type { Metadata } from 'next';

export const metadata: Metadata = { title: '使用条款 — AI 新闻中心' };

export default function TermsPage() {
  return (
    <div className="container-site max-w-3xl py-12 sm:py-16">
      <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Terms</span></div>
      <h1 className="font-display text-display-md font-bold">使用条款</h1>
      <div className="prose mt-8 max-w-none">
        <p>本站提供新闻聚合、中文摘要与检索服务，仅用于信息参考。文章、图片和论文版权归原作者或来源机构所有。</p>
        <p>自动生成的翻译与摘要可能存在偏差。涉及研究结论、商业决策或其他重要判断时，请以原文为准。</p>
        <p>转载或进一步使用内容前，请遵守原始来源的许可与署名要求。</p>
      </div>
    </div>
  );
}
