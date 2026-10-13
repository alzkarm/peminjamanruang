/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
  // Satu pintu: browser cukup buka port 3000. Semua /api/* diteruskan ke
  // backend NestJS (port 4000) di sisi server, jadi tidak ada CORS browser.
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000/api';
    return [
      {
        source: '/backend-api/:path*',
        destination: `${backend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
