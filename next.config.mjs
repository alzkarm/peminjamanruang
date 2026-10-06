/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
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
