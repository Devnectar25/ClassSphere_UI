import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  experimental: {
    // Signed-in areas render client-side after the session check; validate only segments that opt in
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    resolveAlias: {
      canvg: "./src/lib/empty.ts",
      html2canvas: "./src/lib/empty.ts",
      dompurify: "./src/lib/empty.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvg: false,
      html2canvas: false,
      dompurify: false,
    };
    return config;
  },
};

export default nextConfig;
