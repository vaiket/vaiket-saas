import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    JWT_SECRET: process.env.JWT_SECRET, // ✅ Still available everywhere
  },
  experimental: {
    turbo: false, // ✅ Disable Turbopack & fix Render build errors
  },
};

export default nextConfig;
