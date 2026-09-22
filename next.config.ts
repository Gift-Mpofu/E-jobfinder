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
  async redirects() {
    return [
      {
        source: '/dashboard/settings',
        destination: '/dashboard/profile',
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /opentelemetry/ },
      { module: /require-in-the-middle/ },
    ];
    return config;
  },
};

export default nextConfig;
