import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  transpilePackages: ['recharts', 'pdfjs-dist'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
