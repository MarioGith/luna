import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Skip ESLint and TypeScript errors during build for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Configure image domains for GitHub avatars
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  
  // External packages configuration (moved from experimental)
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
