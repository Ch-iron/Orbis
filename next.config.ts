import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // NEAR Snap imports this subpath directly, bypassing near-api-js's browser entry.
      'near-api-js/lib/key_stores': { browser: 'near-api-js/lib/key_stores/browser-index.js' },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'square.kaia.io',
        pathname: '/files/**',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
        pathname: '/keybase_processed_uploads/**',
      },
    ],
  },
};

export default nextConfig;
