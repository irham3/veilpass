import { describe, expect, test, vi } from "vitest";

import { Address, xdr } from "@stellar/stellar-sdk";
import { decodeContractId, decodeEd25519PublicKey, encodeEd25519PublicKey, readGateState, readRevocationState } from "./contract";

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

  test("rejects malformed StrKeys and payload lengths", () => {
    expect(() => decodeContractId("not-a-strkey")).toThrow(/StrKey/i);
    expect(() => decodeEd25519PublicKey("A")).toThrow(/StrKey/i);
    expect(() => encodeEd25519PublicKey(new Uint8Array(31))).toThrow(/payload/i);
    const valid = "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZZ";
    expect(() => decodeContractId(valid)).toThrow(/checksum|StrKey/i);
  });

  test("simulates gate and revocation reads using a read-only Soroban transaction", async () => {
    const owner = "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM";
    const value = xdr.ScVal.scvMap([
      ["credential_root", xdr.ScVal.scvBytes(Buffer.from("11".repeat(32), "hex"))],
      ["epoch", xdr.ScVal.scvU32(7)],
      ["owner", Address.fromString(owner).toScVal()],
      ["policy_hash", xdr.ScVal.scvBytes(Buffer.from("22".repeat(32), "hex"))],
      ["updated_at", xdr.ScVal.scvU64(xdr.Uint64.fromString("123456789"))],
    ].map(([key, val]) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(String(key)), val: val as xdr.ScVal })));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { results: [{ xdr: value.toXDR("base64").toString() }] } }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(readGateState({ contractId: "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY", gateId: "premium-holder", sourceAccount: owner })).resolves.toEqual({
      owner,
      policy_hash: Buffer.from("22".repeat(32), "hex"),
      credential_root: Buffer.from("11".repeat(32), "hex"),
      epoch: 7,
      updated_at: BigInt("123456789"),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ method: "simulateTransaction", params: { transaction: expect.any(String) } });

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ result: { results: [{ xdr: xdr.ScVal.scvBool(true).toXDR("base64").toString() }] } }) });
    await expect(readRevocationState({ contractId: "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY", gateId: "premium-holder", revocationHash: "33".repeat(32), sourceAccount: owner })).resolves.toBe(true);
  });

  test("fails closed for RPC, XDR, and malformed contract responses", async () => {
    const input = { contractId: "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY", gateId: "premium-holder", sourceAccount: "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM" };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ error: { code: -1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { results: [{ xdr: xdr.ScVal.scvBool(false).toXDR("base64").toString() }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ result: { results: [{ xdr: xdr.ScVal.scvU32(1).toXDR("base64").toString() }] } }) }));

    await expect(readGateState(input)).rejects.toThrow("RPC simulation failed with HTTP 503");
    await expect(readGateState(input)).rejects.toThrow("Contract simulation failed");
    await expect(readGateState(input)).rejects.toThrow("Gate state return value is not a map");
    await expect(readRevocationState({ ...input, revocationHash: "00".repeat(32) })).rejects.toThrow("Boolean return value expected");
  });

  test("rejects missing or mistyped gate fields and non-account owners", async () => {
    const input = { contractId: "CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY", gateId: "premium-holder", sourceAccount: "GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM" };
    const owner = Address.fromString(input.sourceAccount).toScVal();
    const contractOwner = Address.fromString(input.contractId).toScVal();
    const value = (overrides: Record<string, xdr.ScVal> = {}) => xdr.ScVal.scvMap(Object.entries({
      credential_root: xdr.ScVal.scvBytes(Buffer.alloc(32)),
      epoch: xdr.ScVal.scvU32(1),
      owner,
      policy_hash: xdr.ScVal.scvBytes(Buffer.alloc(32)),
      updated_at: xdr.ScVal.scvU64(xdr.Uint64.fromString("1")),
      ...overrides,
    }).map(([key, val]) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val })));
    const simulate = (result: xdr.ScVal) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { results: [{ xdr: result.toXDR("base64").toString() }] } }) }));

    simulate(xdr.ScVal.scvMap([]));
    await expect(readGateState(input)).rejects.toThrow("missing required fields");

    for (const [key, wrong] of [
      ["credential_root", xdr.ScVal.scvBool(true)],
      ["policy_hash", xdr.ScVal.scvBool(true)],
      ["epoch", xdr.ScVal.scvBool(true)],
      ["owner", xdr.ScVal.scvBool(true)],
      ["updated_at", xdr.ScVal.scvBool(true)],
    ] as const) {
      simulate(value({ [key]: wrong }));
      await expect(readGateState(input)).rejects.toThrow("unexpected field types");
    }

    simulate(value({ owner: contractOwner }));
    await expect(readGateState(input)).rejects.toThrow("not an account address");
  });
});
