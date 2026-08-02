import { describe, expect, it } from "vitest";

import { normalizeOrigin } from "./origin";

describe("normalizeOrigin", () => {
  it.each([
    ["HTTPS://Example.COM:443/", "https://example.com"],
    ["https://example.com:8443/", "https://example.com:8443"],
    ["http://localhost:3000/", "http://localhost:3000"],
    ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ["http://[::1]:3000", "http://[::1]:3000"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeOrigin(input)).toBe(expected);
  });

  it.each([
    "http://example.com",
    "https://user@example.com",
    "https://*.example.com",
    "https://example.com/path",
    "https://example.com?query=1",
    "https://example.com#fragment",
    "null",
    "data:text/plain,hello",
  ])("rejects unsafe origin %s", (input) => {
    expect(() => normalizeOrigin(input)).toThrow(/origin/i);
  });
});
