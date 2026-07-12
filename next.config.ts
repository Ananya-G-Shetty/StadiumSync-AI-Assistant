import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Disable ESLint check during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript build errors blocking build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
