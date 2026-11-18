/** @type {import('next').NextConfig} */
const nextConfig = {
  // A second output folder lets a production build be checked while `next dev` keeps running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Fewer, well-chosen widths: shorter srcset in the HTML and fewer variants for
    // the server to resize and keep.
    deviceSizes: [420, 640, 828, 1080, 1440, 1920],
    imageSizes: [64, 96, 160, 256, 320],
    // Product photos never change under the same URL: keep the resized copy for a month
    // instead of re-encoding it every time the upstream cache header runs out.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    domains: [
      'shop.juventa.ua', 
      'utfs.io', 
      'uploadthing.com', 
      "www.sveamoda.com.ua", 
      "sveamoda.com.ua",
      "assets.nordiva.com.ua", // <-- Your production MinIO hostname
      "localhost"           // <-- Added just in case you test without MINIO_PUBLIC_URL
    ], 
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.rozetka.com.ua",
      },
      {
        protocol: "https",
        hostname: "assets.nordiva.com.ua", // <-- Your production MinIO hostname
      }
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://eu.i.posthog.com/decide",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;