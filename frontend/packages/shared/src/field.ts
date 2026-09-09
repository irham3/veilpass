/**
 * Canonical, 32-byte BN254 scalar encoding used by the Noir membership
 * circuit. Values are kept as lowercase, unprefixed hex at API boundaries.
 * Keeping this module free of Node APIs lets the hosted login use exactly the
 * same encoding as the verifier.
 */
export const BN254_SCALAR_MODULUS_HEX = "30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47";
const FIELD_HEX_LENGTH = 64;

export function canonicalFieldHex(value: string): string {
  const normalized = value.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{1,64}$/.test(normalized)) throw new Error("Expected a field element encoded as at most 32 bytes of hex");
  const padded = normalized.padStart(FIELD_HEX_LENGTH, "0");
  if (padded >= BN254_SCALAR_MODULUS_HEX) throw new Error("Field element exceeds the BN254 scalar modulus");
  return padded;
}

export function fieldHexToNoir(value: string): string {
  return `0x${canonicalFieldHex(value)}`;
}

export function fieldHexFromBytes(bytes: Uint8Array): string {
  if (bytes.byteLength !== 32) throw new Error("Expected exactly 32 bytes for a field element");
  return canonicalFieldHex(Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""));
}

/** Maps a SHA-256 digest into a 253-bit field value without a modulo bias. */
export function fieldHexFromDigest(bytes: Uint8Array): string {
  if (bytes.byteLength !== 32) throw new Error("Expected a 32-byte digest");
  const fieldBytes = Uint8Array.from(bytes);
  fieldBytes[0] &= 0x1f;
  return fieldHexFromBytes(fieldBytes);
}

export function u64ToFieldHex(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Expected a non-negative safe integer");
  const bytes = new Uint8Array(32);
  let remaining = value;
  for (let index = 31; index >= 0 && remaining > 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return fieldHexFromBytes(bytes);
}

export function randomFieldHex(randomBytes: Uint8Array): string {
  if (randomBytes.byteLength !== 32) throw new Error("Expected 32 random bytes");
  const fieldBytes = Uint8Array.from(randomBytes);
  fieldBytes[0] &= 0x1f;
  return fieldHexFromBytes(fieldBytes);
}

export async function hashTextToFieldHex(value: string): Promise<string> {
  return hashBytesToFieldHex(new TextEncoder().encode(value));
}

export async function hashBytesToFieldHex(value: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable");
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(value)));
  return fieldHexFromDigest(digest);
}

export function base64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(padded)) throw new Error("Invalid base64url value");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
