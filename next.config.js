/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // RSS feed images
      { protocol: 'https', hostname: 'techcrunch.com' },
      { protocol: 'https', hostname: '*.techcrunch.com' },
      { protocol: 'https', hostname: 'wp.technologyreview.com' },
      { protocol: 'https', hostname: 'venturebeat.com' },
      { protocol: 'https', hostname: 'i0.wp.com' },
      { protocol: 'https', hostname: 'i1.wp.com' },
      { protocol: 'https', hostname: 'i2.wp.com' },
      { protocol: 'https', hostname: 'images.ctfassets.net' },
      { protocol: 'https', hostname: 'cdn.vox-cdn.com' },
      // Chinese sources
      { protocol: 'https', hostname: '*.xlab.app' },
      { protocol: 'https', hostname: '*.geekpark.net' },
      { protocol: 'https', hostname: '*.people.com.cn' },
      { protocol: 'https', hostname: '*.xinhuanet.com' },
      { protocol: 'https', hostname: '*.rssforever.com' },
      { protocol: 'https', hostname: '*.rsshub.app' },
      // arXiv
      { protocol: 'https', hostname: 'arxiv.org' },
      { protocol: 'https', hostname: '*.arxiv.org' },
      // Common media CDNs
      { protocol: 'https', hostname: '*.wp.com' },
      { protocol: 'https', hostname: '*.cloudfront.net' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.ggpht.com' },
      { protocol: 'https', hostname: '*.githubusercontent.com' },
      { protocol: 'https', hostname: '*.gitlab.com' },
      { protocol: 'https', hostname: '*.medium.com' },
      { protocol: 'https', hostname: '*.substack.com' },
      { protocol: 'https', hostname: '*.ghost.org' },
      // Feishu/ Lark
      { protocol: 'https', hostname: '*.feishu.cn' },
      { protocol: 'https', hostname: 'geek.feishu.cn' },
      { protocol: 'https', hostname: '*.feishu.net' },
      { protocol: 'https', hostname: '*.larksuite.com' },
      // Wildcard for any other domains
      { protocol: 'https', hostname: '**' },
    ],
    // Allow unoptimized images for external URLs (many CDNs block Next.js image optimization)
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
      },
    ];
  },
};

module.exports = nextConfig;