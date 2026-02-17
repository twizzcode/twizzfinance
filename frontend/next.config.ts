import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const authTarget = process.env.AUTH_BACKEND_ORIGIN || "http://127.0.0.1:4000";
    return [
      {
        source: "/api/auth/:path*",
        destination: `${authTarget}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
