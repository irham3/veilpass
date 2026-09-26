import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const server = {
    loadAccount: vi.fn(async (address) => ({ address })),
    submitTransaction: vi.fn(async () => ({ hash: `hash-${server.submitTransaction.mock.calls.length}` })),
  };
  const transaction = { sign: vi.fn() };
  const builder = { addOperation: vi.fn().mockReturnThis(), setTimeout: vi.fn().mockReturnThis(), build: vi.fn(() => transaction) };
  return {
    readFile: vi.fn(async () => "# Legacy fixture is disabled\nVEILPASS_ASSET_TYPE=native\n"),
    server,
    transaction,
    builder,
    fromSecret: vi.fn(() => ({ publicKey: () => "GISSUER" })),
    random: vi.fn(() => ({ publicKey: () => "GDISTRIBUTION" })),
    HorizonServer: vi.fn(function Server() { return server; }),
    Asset: vi.fn(function Asset(code, issuer) { this.code = code; this.issuer = issuer; }),
    Operation: {
      createAccount: vi.fn((value) => ({ type: "createAccount", ...value })),
      changeTrust: vi.fn((value) => ({ type: "changeTrust", ...value })),
      payment: vi.fn((value) => ({ type: "payment", ...value })),
    },
    TransactionBuilder: vi.fn(function TransactionBuilder() { return builder; }),
    Networks: { TESTNET: "testnet" },
  };
});
const { readFile } = mocks;
vi.mock("node:fs/promises", () => ({ readFile }));
vi.mock("@stellar/stellar-sdk", () => ({
  Asset: mocks.Asset,
  Horizon: { Server: mocks.HorizonServer },
  Keypair: { fromSecret: mocks.fromSecret, random: mocks.random },
  Networks: mocks.Networks,
  Operation: mocks.Operation,
  TransactionBuilder: mocks.TransactionBuilder,
}));

const originalExitCode = process.exitCode;
beforeEach(() => {
  readFile.mockReset().mockResolvedValue("# Legacy fixture is disabled\nVEILPASS_ASSET_TYPE=native\n");
  mocks.fromSecret.mockReset().mockReturnValue({ publicKey: () => "GISSUER" });
  mocks.HorizonServer.mockClear();
  mocks.server.loadAccount.mockReset().mockImplementation(async (address) => ({ address }));
  mocks.server.submitTransaction.mockReset().mockImplementation(async () => ({ hash: `hash-${mocks.server.submitTransaction.mock.calls.length}` }));
  mocks.Operation.createAccount.mockClear();
  mocks.Operation.changeTrust.mockClear();
  mocks.Operation.payment.mockClear();
  mocks.builder.addOperation.mockClear().mockReturnThis();
  mocks.builder.setTimeout.mockClear().mockReturnThis();
  mocks.transaction.sign.mockClear();
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); vi.clearAllMocks(); process.exitCode = originalExitCode; });

const assetEnv = "VEILPASS_ASSET_CODE=VPT\nVEILPASS_ASSET_ISSUER=GISSUER\nVEILPASS_ISSUER_SECRET=private-secret";
async function runMain(suffix, response) {
  process.exitCode = originalExitCode;
  const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  if (response) vi.stubGlobal("fetch", vi.fn(async () => response));
  const imports = {
    native: () => import("./seed-testnet-asset.mjs?native"),
    missing: () => import("./seed-testnet-asset.mjs?missing"),
    mismatch: () => import("./seed-testnet-asset.mjs?mismatch"),
    "horizon-error": () => import("./seed-testnet-asset.mjs?horizon-error"),
    discoverable: () => import("./seed-testnet-asset.mjs?discoverable"),
    seed: () => import("./seed-testnet-asset.mjs?seed"),
  };
  await imports[suffix]();
  await vi.waitFor(() => expect(process.exitCode === 1 || output.mock.calls.length > 0).toBe(true));
  return { output, error };
}

describe("legacy issued-asset fixture seeder", () => {
  it("fails closed for the native-XLM policy before contacting Horizon", async () => {
    const { error } = await runMain("native");
    expect(process.exitCode).toBe(1);
    expect(error.mock.calls[0]?.[0]).toContain("native XLM eligibility needs no issuer");
    expect(readFile).toHaveBeenCalledWith(".env.local", "utf8");
    expect(mocks.HorizonServer).not.toHaveBeenCalled();
  });

  it("rejects missing or mismatched issuer configuration", async () => {
    readFile.mockResolvedValueOnce("VEILPASS_ASSET_CODE=VPT");
    const missing = await runMain("missing");
    expect(missing.error.mock.calls[0]?.[0]).toContain("Missing VEILPASS_ASSET_ISSUER");
    readFile.mockResolvedValueOnce(assetEnv);
    mocks.fromSecret.mockReturnValueOnce({ publicKey: () => "GOTHER" });
    const mismatch = await runMain("mismatch");
    expect(mismatch.error.mock.calls.at(-1)?.[0]).toContain("does not match VEILPASS_ASSET_ISSUER");
    expect(mocks.HorizonServer).not.toHaveBeenCalled();
  });

  it("stops when Horizon reports an error or the asset is already discoverable", async () => {
    readFile.mockResolvedValueOnce(assetEnv);
    const failed = await runMain("horizon-error", { ok: false, status: 502 });
    expect(failed.error.mock.calls[0]?.[0]).toContain("Could not query Horizon asset directory (502)");
    readFile.mockResolvedValueOnce(assetEnv);
    const discoverable = await runMain("discoverable", { ok: true, json: async () => ({ _embedded: { records: [{ asset_code: "VPT" }] } }) });
    expect(discoverable.output.mock.calls[0]?.[0]).toContain("already discoverable");
    expect(mocks.HorizonServer).not.toHaveBeenCalled();
  });

  it("creates a distribution account, trustline, and one-unit discovery payment", async () => {
    readFile.mockResolvedValueOnce(assetEnv);
    const { output } = await runMain("seed", { ok: true, json: async () => ({ _embedded: { records: [] } }) });
    expect(mocks.HorizonServer).toHaveBeenCalledWith("https://horizon-testnet.stellar.org");
    expect(mocks.server.loadAccount).toHaveBeenNthCalledWith(1, "GISSUER");
    expect(mocks.server.loadAccount).toHaveBeenNthCalledWith(2, "GDISTRIBUTION");
    expect(mocks.server.loadAccount).toHaveBeenNthCalledWith(3, "GISSUER");
    expect(mocks.Operation.createAccount).toHaveBeenCalledWith({ destination: "GDISTRIBUTION", startingBalance: "2" });
    expect(mocks.Operation.changeTrust).toHaveBeenCalledOnce();
    expect(mocks.Operation.payment).toHaveBeenCalledWith(expect.objectContaining({ destination: "GDISTRIBUTION", amount: "1" }));
    expect(mocks.server.submitTransaction).toHaveBeenCalledTimes(3);
    expect(output.mock.calls[0]?.[0]).toContain("A one-unit Testnet distribution balance");
    expect(output.mock.calls[0]?.[0]).not.toContain("private-secret");
  });
});
