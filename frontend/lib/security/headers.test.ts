import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy, popupOpenerHeaders, securityHeaders } from "./headers";

describe("security headers", () => {
  it("uses a request nonce and forbids unsafe inline production scripts", () => {
    const policy = createContentSecurityPolicy("nonce-value", false);

    expect(policy).toContain("script-src 'self' 'nonce-nonce-value' 'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it("allows the development-only eval and inline style escape hatches", () => {
    const policy = createContentSecurityPolicy("dev-nonce", true);

    expect(policy).toContain("script-src 'self' 'nonce-dev-nonce' 'strict-dynamic' 'wasm-unsafe-eval' 'unsafe-eval'");
    expect(policy).toContain("style-src 'self' 'nonce-dev-nonce' 'unsafe-inline'");
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

  it("keeps the exact-origin popup channel connected to its host opener", () => {
    expect(popupOpenerHeaders).toEqual([
      { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
    ]);
    expect(securityHeaders).toContainEqual({
      key: "Cross-Origin-Opener-Policy",
      value: "same-origin-allow-popups",
    });
  });
});
