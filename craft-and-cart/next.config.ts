import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output (.next/standalone): this is what the Docker image runs.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;