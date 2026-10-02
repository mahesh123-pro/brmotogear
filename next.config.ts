import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:5000'}/api/v1/:path*`,
      },
    ];
  },
  images: {
    localPatterns: [
      { pathname: '/images/**', search: '' },
      { pathname: '/images/**', search: '?v=2' },
    ],
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};
export default config;
