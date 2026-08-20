import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "10.114.122.59",
    "cryptic-scolding-splendid.ngrok-free.dev",
    "cryptic-scolding-splendid.ngrok-free.app",
    "localhost"
  ],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

