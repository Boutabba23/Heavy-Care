/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_KEY: process.env.GOOGLE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  },
  images: {
    domains: [],
  },
  experimental: {
    // Enable any experimental features if needed
  },
};

module.exports = nextConfig;
