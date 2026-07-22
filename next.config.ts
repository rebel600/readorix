import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Segment uploads are batched client-side to stay under this; the headroom
      // above the 1MB default covers multipart overhead and outlier segments.
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
      },
      {
        protocol: "https",
        hostname: "sopdwsdk8oaho5ci.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
