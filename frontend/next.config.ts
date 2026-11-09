import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        source: "/api/v1/:path*",
        destination: "${backendUrl}/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;

