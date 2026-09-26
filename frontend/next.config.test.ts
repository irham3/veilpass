import { describe, expect, it } from "vitest";

import config from "./next.config";

describe("Next runtime configuration", () => {
  it("keeps package transpilation and threaded proof WASM in production traces", async () => {
    expect(config.poweredByHeader).toBe(false);
    expect(config.transpilePackages).toContain("@veilpass/sdk");
    expect(config.serverExternalPackages).toContain("@aztec/bb.js");
    expect(config.outputFileTracingIncludes?.["/*"]).toContain("./node_modules/@aztec/bb.js/dest/node/barretenberg_wasm/**");
  });

  it("routes only the two controlled hostnames and installs hardened headers", async () => {
    const rewrites = await config.rewrites?.();
    const hosts = rewrites && "beforeFiles" in rewrites && rewrites.beforeFiles ? rewrites.beforeFiles : [];
    expect(hosts).toHaveLength(4);
    expect(hosts.map((rule) => rule.destination)).toEqual(["/host/app-a", "/host/app-b", "/host/app-a", "/host/app-b"]);
    const headers = await config.headers?.();
    expect(headers?.map((rule) => rule.source)).toEqual(["/:path*", "/login", "/dashboard/enroll"]);
    expect(headers?.[0]?.headers.some((header) => header.key === "X-Content-Type-Options" && header.value === "nosniff")).toBe(true);
  });
});
