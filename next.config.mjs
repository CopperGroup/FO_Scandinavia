import { readFileSync } from "node:fs";

// Sizes and hosts shared with the shop's own photo route (app/img, lib/photo).
const photo = JSON.parse(readFileSync(new URL("./lib/photo/config.json", import.meta.url), "utf8"));
// NEXT_PUBLIC_PHOTO_ROUTE=on (in the env file the build reads) makes every next/image picture come from /img
// instead of Next's own /_next/image. Off by default: switch it on only after the store of resized photos
// was filled (tools/image-cache/warm.sh), or the first visitors get the photos as uploaded, unresized.
const ownPhotoRoute = process.env.NEXT_PUBLIC_PHOTO_ROUTE === "on";

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
    deviceSizes: photo.deviceSizes,
    imageSizes: photo.imageSizes,
    ...(ownPhotoRoute ? { loader: "custom", loaderFile: "./lib/photo/loader.ts" } : {}),
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
  // The shop's own fonts (app/fonts.css). A month in the browser: they change only when
  // tools/fonts/fetch-fonts.mjs is run again.
  async headers() {
    return [{ source: "/fonts/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] }];
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