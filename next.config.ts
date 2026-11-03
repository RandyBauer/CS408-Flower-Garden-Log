import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // The planting form uploads a tag photo of up to 10 MB with its other fields. Server actions
    // accept 1 MB by default, and proxy.ts (which runs for /plantings) buffers 10 MB.
    // deploy/nginx-gardenlog.conf allows the same 12 MB.
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
  },
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
