/** @type {import('next').NextConfig} */
const nextConfig = {
  // Export the app as a fully static site that Electron can load without a server.
  output: "export",
  trailingSlash: true,
  images: {
    // Image optimization requires a server; disable it for the static export.
    unoptimized: true,
  },
  env: {
    API_KEY: process.env.GOOGLE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  },
};

module.exports = nextConfig;
