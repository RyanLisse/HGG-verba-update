/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  eslint: {
    // We use Biome for linting; disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.glsl$/,
      use: ['raw-loader'],
    });
    return config;
  },
  // Note: redirects() is commented out because it doesn't work with output: 'export'
  // If you need redirects, handle them in the application logic or remove output: 'export'
  // async redirects() {
  //   return [
  //     {
  //       source: '/v1',
  //       destination: '/',
  //       permanent: true,
  //     },
  //     {
  //       source: '/v1/:path*',
  //       destination: '/:path*',
  //       permanent: true,
  //     },
  //   ];
  // },
};

// IMPORTANT:
// Do NOT force assetPrefix for all production runs — it breaks next start (assets 404 at /static/*).
// Enable it ONLY when you intentionally host the exported site behind a /static prefix.
// To opt in, set env: EXPORT_ASSET_PREFIX=true
if (process.env.EXPORT_ASSET_PREFIX === 'true') {
  nextConfig.assetPrefix = '/static';
}

module.exports = withBundleAnalyzer(nextConfig);
