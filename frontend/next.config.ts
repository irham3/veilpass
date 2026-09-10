import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@veilpass/shared", "@veilpass/sdk", "@veilpass/server"],
  async rewrites() {
    return {
      beforeFiles: [
        // Next.js matches `has.type = host` against the hostname (without the
        // development port). Keep the port out of these expressions so the
        // same rewrites work in local development and behind a HTTPS proxy.
        { source: "/", has: [{ type: "host", value: "app-a\\.localhost" }], destination: "/host/app-a" },
        { source: "/", has: [{ type: "host", value: "app-b\\.localhost" }], destination: "/host/app-b" },
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
