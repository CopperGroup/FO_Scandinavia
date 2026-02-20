/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: [
      'shop.juventa.ua', 
      'utfs.io', 
      'uploadthing.com', 
      "www.sveamoda.com.ua", 
      "sveamoda.com.ua",
      "assets.nordiva.com", // <-- Your production MinIO hostname
      "localhost"           // <-- Added just in case you test without MINIO_PUBLIC_URL
    ], 
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.rozetka.com.ua",
      },
      {
        protocol: "https",
        hostname: "assets.nordiva.com", // <-- Your production MinIO hostname
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