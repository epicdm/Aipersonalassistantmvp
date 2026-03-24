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
};

export default nextConfig;
