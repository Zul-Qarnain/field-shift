import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets live reload work when the dev server is opened through a
  // Cloudflare quick tunnel (*.trycloudflare.com). No effect on production builds.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
