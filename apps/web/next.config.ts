import path from "path";
import type { NextConfig } from "next";
import { NEXT_MIDDLEWARE_CLIENT_MAX_BODY_SIZE } from "./lib/uploads";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@brevoca/contracts"],
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/ffmpeg-static/**/*",
      "../../node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/**/*",
    ],
  },
  experimental: {
    middlewareClientMaxBodySize: NEXT_MIDDLEWARE_CLIENT_MAX_BODY_SIZE,
  },
};

export default nextConfig;
