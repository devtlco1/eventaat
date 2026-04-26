import type { NextConfig } from "next";

// Dev/build use webpack via package.json `next dev --webpack` / `next build --webpack`
// to avoid Turbopack hangs in this monorepo (Next 16 defaults to Turbopack).
const nextConfig: NextConfig = {};

export default nextConfig;
