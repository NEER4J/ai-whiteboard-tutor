import type { NextConfig } from "next";

// Resolve the public origin once, at build time, and inline it for metadata and sitemaps.
// (Reading Vercel's env vars inside page metadata would make dynamic routes' metadata "runtime".)
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  (process.env.NODE_ENV === "production" ? "https://chalk.itsneeraj.com" : "http://localhost:3000")
).replace(/\/$/, "")

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_SITE_URL: siteUrl },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
