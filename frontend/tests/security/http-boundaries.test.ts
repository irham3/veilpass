import { describe, expect, it } from "vitest";

import { createContentSecurityPolicy, securityHeaders } from "@/lib/security/headers";
import { readJsonLimited } from "@/lib/server/request-body";
import { publicError } from "@/lib/server/responses";

describe("security boundaries", () => {
  it("keeps production CSP nonce-based and blocks common injection sinks", () => {
    const policy = createContentSecurityPolicy("known-nonce", false);

    expect(policy).toContain("script-src 'self' 'nonce-known-nonce' 'strict-dynamic'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it("ships browser hardening headers with no permissive device policy", () => {
    const headers = new Map(securityHeaders.map(({ key, value }) => [key.toLowerCase(), value]));

    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.get("permissions-policy")).toContain("camera=()");
    expect(headers.get("permissions-policy")).toContain("payment=()");
  });

  it("enforces the actual body size when content-length is absent or dishonest", async () => {
    const oversized = new Request("https://app.example/api", {
      method: "POST",
      body: JSON.stringify({ value: "x".repeat(128) }),
    });
    await expect(readJsonLimited(oversized, 32)).rejects.toThrow("Request body too large");

    const dishonest = new Request("https://app.example/api", {
      method: "POST",
      headers: { "content-length": "1" },
      body: JSON.stringify({ value: "x".repeat(128) }),
    });
    await expect(readJsonLimited(dishonest, 32)).rejects.toThrow("Request body too large");
  });

  it("rejects malformed JSON and returns minimized public errors", async () => {
    const malformed = new Request("https://app.example/api", { method: "POST", body: "{" });
    await expect(readJsonLimited(malformed, 32)).rejects.toBeInstanceOf(SyntaxError);

    const response = publicError("PROOF_INVALID", "request-safe", 400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "PROOF_INVALID",
      requestId: "request-safe",
    });
  });
});
