import { describe, expect, it } from "vitest";

import { verifyStellarMessageSignature } from "./message-signature";

const address = "GBXFXNDLV4LSWA4VB7YIL5GBD7BVNR22SGBTDKMO2SBZZHDXSKZYCP7L";
const signature = "fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==";

describe("SEP-53 message signature verification", () => {
  it("accepts the official Stellar SEP-53 test vector", () => {
    expect(verifyStellarMessageSignature({ address, message: "Hello, World!", signature })).toBe(true);
  });

  it("rejects a signature made over raw message bytes", async () => {
    const { Keypair } = await import("@stellar/stellar-sdk");
    const keypair = Keypair.random();
    const message = "VeilPass enrollment";
    const rawSignature = keypair.sign(Buffer.from(message)).toString("base64");

    expect(verifyStellarMessageSignature({ address: keypair.publicKey(), message, signature: rawSignature })).toBe(false);
  });

  it.each([
    { address: "not-an-address", signature },
    { address, signature: "not-base64" },
    { address, signature: Buffer.alloc(63).toString("base64") },
    { address, signature: `${signature}\n` },
  ])("rejects malformed public keys and signatures", (input) => {
    expect(verifyStellarMessageSignature({ ...input, message: "Hello, World!" })).toBe(false);
  });

  it("rejects a signature for a different message", () => {
    expect(verifyStellarMessageSignature({ address, message: "Hello, VeilPass!", signature })).toBe(false);
  });
});
