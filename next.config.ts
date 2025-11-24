import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => config,
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  }
};

export default nextConfig;
