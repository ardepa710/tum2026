import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — page cannot be embedded in an iframe
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Restrict referrer info to same origin only
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict browser feature APIs
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
  // Force HTTPS for 1 year (only effective in prod)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Disable DNS prefetching to reduce info leakage
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    // Note: unsafe-inline/unsafe-eval required for Next.js App Router hydration.
    // Nonce-based CSP would be stronger but requires middleware integration.
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://graph.microsoft.com",
      "connect-src 'self' https://login.microsoftonline.com",
      "font-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://login.microsoftonline.com",
    ].join("; "),
  },
];

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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
