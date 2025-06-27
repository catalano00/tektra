import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Your other config options go here...

  eslint: {
    ignoreDuringBuilds: true, // ✅ this disables ESLint during Vercel build
  },
}

export default nextConfig;
