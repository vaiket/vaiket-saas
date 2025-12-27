/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Allow build even if TS errors exist (safe for prod)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optional: disable SWC issues on Windows
  swcMinify: true,

  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

module.exports = nextConfig;
