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
        // Vercel Blob gives each store its own subdomain (the store ID), which
        // differs per environment. A single-segment wildcard covers any store
        // so a new deployment or store doesn't silently break cover images.
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
