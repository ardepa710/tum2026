import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Microsoft Graph API external images if needed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "graph.microsoft.com",
      },
    ],
  },
};

export default nextConfig;
