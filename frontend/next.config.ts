import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@veilpass/shared", "@veilpass/sdk", "@veilpass/server"],
  // Barretenberg loads its threaded WASM artifact with fs at runtime. Next's
  // tracer sees the JavaScript import but not that dynamic file read, so make
  // it an explicit production-function dependency. Without this inclusion,
  // enrollment can validate a Freighter signature and then fail while it
  // builds the private Merkle witness on a serverless instance.
  serverExternalPackages: ["@aztec/bb.js"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/**"],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Next.js matches `has.type = host` against the hostname (without the
        // development port). Keep the port out of these expressions so the
        // same rewrites work in local development and behind a HTTPS proxy.
        { source: "/", has: [{ type: "host", value: "app-a\\.localhost" }], destination: "/host/app-a" },
        { source: "/", has: [{ type: "host", value: "app-b\\.localhost" }], destination: "/host/app-b" },
        { source: "/", has: [{ type: "host", value: "app-a\\.veilpass\\.dev" }], destination: "/host/app-a" },
        { source: "/", has: [{ type: "host", value: "app-b\\.veilpass\\.dev" }], destination: "/host/app-b" },
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
