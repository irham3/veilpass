import { describe, expect, it } from "vitest";

import { resolveTrustedOrigin } from "./request-origin";

describe("resolveTrustedOrigin", () => {
  it("uses deployment configuration and requires the request Origin to match", () => {
    expect(resolveTrustedOrigin({ configuredOrigin: "https://APP.Example:443", requestUrl: "http://internal:3000/api", originHeader: "https://app.example" })).toBe("https://app.example");
    expect(() => resolveTrustedOrigin({ configuredOrigin: "https://app.example", requestUrl: "https://app.example/api", originHeader: "https://evil.example" })).toThrow("origin mismatch");
  });

  it("permits request URL fallback only for loopback development", () => {
    expect(resolveTrustedOrigin({ requestUrl: "http://localhost:3000/api", originHeader: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(() => resolveTrustedOrigin({ requestUrl: "https://app.example/api", originHeader: "https://app.example" })).toThrow("configured host origin");
  });

  it("accepts only a configured member of an explicit host allowlist", () => {
    const configured = "https://app-a.example, https://app-b.example";
    expect(resolveTrustedOrigin({ configuredOrigin: configured, requestUrl: "https://internal.example/api", originHeader: "https://app-b.example" })).toBe("https://app-b.example");
    expect(() => resolveTrustedOrigin({ configuredOrigin: configured, requestUrl: "https://internal.example/api", originHeader: "https://other.example" })).toThrow("origin mismatch");
  });
});
