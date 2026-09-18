import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BN254_SCALAR_MODULUS_HEX,
  base64urlToBytes,
  canonicalFieldHex,
  fieldHexFromBytes,
  fieldHexFromDigest,
  fieldHexToNoir,
  hashBytesToFieldHex,
  hashTextToFieldHex,
  randomFieldHex,
  u64ToFieldHex,
} from "./field";

afterEach(() => vi.unstubAllGlobals());

describe("canonical field helpers", () => {
  it("normalizes valid values and emits Noir notation", () => {
    expect(canonicalFieldHex(" 0xAbCd ")).toBe(`${"abcd".padStart(64, "0")}`);
    expect(fieldHexToNoir("0x2a")).toBe(`0x${"2a".padStart(64, "0")}`);
    expect(fieldHexFromBytes(new Uint8Array(32).fill(7))).toBe("07".repeat(32));
    expect(fieldHexFromDigest(new Uint8Array(32).fill(0xff))).toBe(`1f${"ff".repeat(31)}`);
    expect(randomFieldHex(new Uint8Array(32).fill(0xff))).toBe(`1f${"ff".repeat(31)}`);
  });

  it("rejects malformed, oversized, and incorrectly sized values", () => {
    expect(() => canonicalFieldHex("0x")).toThrow(/field element/i);
    expect(() => canonicalFieldHex("g1")).toThrow(/field element/i);
    expect(() => canonicalFieldHex(BN254_SCALAR_MODULUS_HEX)).toThrow(/modulus/i);
    expect(() => fieldHexFromBytes(new Uint8Array(31))).toThrow(/32 bytes/i);
    expect(() => fieldHexFromDigest(new Uint8Array(31))).toThrow(/digest/i);
    expect(() => randomFieldHex(new Uint8Array(31))).toThrow(/32 random bytes/i);
    expect(() => u64ToFieldHex(-1)).toThrow(/safe integer/i);
    expect(() => u64ToFieldHex(Number.MAX_SAFE_INTEGER + 1)).toThrow(/safe integer/i);
  });

  it("hashes text and bytes through Web Crypto and decodes base64url safely", async () => {
    await expect(hashTextToFieldHex("veilpass")).resolves.toMatch(/^[0-9a-f]{64}$/);
    await expect(hashBytesToFieldHex(new Uint8Array([1, 2, 3]))).resolves.toMatch(/^[0-9a-f]{64}$/);
    expect(base64urlToBytes("AQID")).toEqual(new Uint8Array([1, 2, 3]));
    expect(base64urlToBytes("AQI")).toEqual(new Uint8Array([1, 2]));
    expect(() => base64urlToBytes("not valid!" )).toThrow(/base64url/i);
  });

  it("fails explicitly when Web Crypto is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    await expect(hashBytesToFieldHex(new Uint8Array([1]))).rejects.toThrow(/Web Crypto/i);
  });
});
