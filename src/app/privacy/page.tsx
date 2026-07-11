import type { Metadata } from 'next';

export const metadata: Metadata = { title: '隐私说明 — AI 新闻中心' };

export default function PrivacyPage() {
  return (
    <div className="container-site max-w-3xl py-12 sm:py-16">
      <div className="page-eyebrow"><span className="cursor-mark" aria-hidden="true" /><span className="section-label">Privacy</span></div>
      <h1 className="font-display text-display-md font-bold">隐私说明</h1>
      <div className="prose mt-8 max-w-none">
        <p>收藏数据仅保存在你的浏览器本地存储中，不会上传到服务器。</p>
        <p>当你主动提交邮箱订阅时，网站只会将该地址用于发送 AI 资讯摘要。我们不会出售或公开订阅信息。</p>
        <p>本站聚合公开 RSS 与开放学术信源。访问原始来源时，第三方网站可能适用各自的隐私政策。</p>
      </div>
    </div>
  );
}
