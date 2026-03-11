import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "sharp",
    "jimp",
    "ssh2",
    "web-push",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://api.bff.epic.dm/api/:path*",
      },
      {
        source: "/v2/:path*",
        destination: "https://api.bff.epic.dm/v2/:path*",
      },
      {
        source: "/v2",
        destination: "https://api.bff.epic.dm/v2/",
      },
    ];
  },
};

export default nextConfig;
