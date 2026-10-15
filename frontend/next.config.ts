import type { NextConfig } from "next";

const rawInternalUrl = process.env.INTERNAL_API_URL || 'http://localhost:4000';
const internalApiUrl = rawInternalUrl.replace(/\/+$/, '').replace(/\/api$/, '');

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
