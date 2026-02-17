import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["https://192.168.1.48:3000"],
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
