import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@veilpass/shared", "@veilpass/sdk", "@veilpass/server"],
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: [{ type: "host", value: "app-a\\.localhost:3000" }], destination: "/host/app-a" },
        { source: "/", has: [{ type: "host", value: "app-b\\.localhost:3000" }], destination: "/host/app-b" },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
