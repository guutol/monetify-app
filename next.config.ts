import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure font used by watermark.ts is included in the serverless bundle
  outputFileTracingIncludes: {
    "/api/images/[imageId]/preview": ["./src/assets/fonts/*.ttf"],
  },
  images: {
    dangerouslyAllowSVG: false,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
      {
        // Mock image generation in development
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
