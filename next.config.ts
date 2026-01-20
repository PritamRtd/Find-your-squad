import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow Codespaces URLs for development
  allowedDevOrigins: [
    'https://potential-system-w67wp75w4jrcg5w9-3000.app.github.dev',
    'https://*.app.github.dev',
  ],
  // Enable server actions with allowed origins for Codespaces
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'potential-system-w67wp75w4jrcg5w9-3000.app.github.dev',
        '*.app.github.dev',
      ],
    },
  },
};

export default nextConfig;
