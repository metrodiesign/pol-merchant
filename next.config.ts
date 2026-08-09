import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "api-prod-minimal-v700.pages.dev",
      },
    ],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const merchantApiOrigin =
      process.env.MERCHANT_API_ORIGIN || "http://localhost:5100";

    return [
      {
        source: "/producer/:path*",
        destination: `${merchantApiOrigin}/api/v1/merchants/:path*`,
      },
    ];
  },
};

export default nextConfig;
