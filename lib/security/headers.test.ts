import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy, securityHeaders } from "./headers";

describe("security headers", () => {
  it("uses a request nonce and forbids unsafe inline production scripts", () => {
    const policy = createContentSecurityPolicy("nonce-value", false);

    expect(policy).toContain("script-src 'self' 'nonce-nonce-value' 'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("locks down referrers and unused device APIs", () => {
    expect(securityHeaders).toEqual(
      expect.arrayContaining([
        { key: "Referrer-Policy", value: "no-referrer" },
        expect.objectContaining({ key: "Permissions-Policy" }),
        { key: "X-Content-Type-Options", value: "nosniff" },
      ]),
    );
  });
});
