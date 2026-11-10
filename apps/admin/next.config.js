/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // The root .eslintrc.json (one level up) cascades into this app and can't
  // resolve next/core-web-vitals from here. Lint stays available via
  // `npm run lint`, it just doesn't gate the production build.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
