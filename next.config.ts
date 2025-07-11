import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Configure image domains if needed
  images: {
    domains: [],
  },
  
  // External packages configuration (moved from experimental)
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;
