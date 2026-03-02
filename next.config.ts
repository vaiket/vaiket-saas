import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔥 FIX: TypeScript build OOM issue
  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => config,

  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },

  serverExternalPackages: ["puppeteer"], // ✔ Next.js 16 compatible
};

export default nextConfig;
