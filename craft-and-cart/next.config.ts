import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output (.next/standalone): this is what the Docker image runs.
  output: "standalone",
  poweredByHeader: false,
  images: {
    // static product photos, and photos uploaded by the Super Admin (served from the database)
    localPatterns: [{ pathname: "/products/**" }, { pathname: "/api/product-image/**" }],
  },
};

export default nextConfig;