import { describe, expect, test } from "vitest";

import { decodeContractId, decodeEd25519PublicKey, encodeEd25519PublicKey } from "./contract";

describe("Stellar contract read helpers", () => {
  test("decodes a contract StrKey into the 32-byte contract address payload", () => {
    expect(Buffer.from(decodeContractId("CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY")).toString("hex")).toBe(
      "be5a38a1467f4438df4fbd04e456a6d7a63386b68f9a1d922f321538c2ae794c",
    );
  });

  test("decodes an ed25519 account StrKey into the 32-byte public key payload", () => {
    expect(Buffer.from(decodeEd25519PublicKey("GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM")).toString("hex")).toBe(
      "a92807d9b3bdbd9ebf66c85f04569620c983dd8a69c7321cdf5c086ec98a2a0e",
    );
  });

  test("encodes a 32-byte ed25519 payload back to a public account StrKey", () => {
    expect(encodeEd25519PublicKey(Buffer.from("a92807d9b3bdbd9ebf66c85f04569620c983dd8a69c7321cdf5c086ec98a2a0e", "hex"))).toBe(
      "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM",
    );
  });
});
