import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stellar = vi.hoisted(() => {
  const api = {
    loadAccount: vi.fn(async (address) => ({ address })),
    submitTransaction: vi.fn(async () => ({ hash: "tx-hash" })),
  };
  const transaction = { sign: vi.fn() };
  const builder = {
    addOperation: vi.fn().mockReturnThis(),
    setTimeout: vi.fn().mockReturnThis(),
    build: vi.fn(() => transaction),
  };
  return {
    api,
    transaction,
    builder,
    fromSecret: vi.fn(() => ({ publicKey: () => "GISSUER" })),
    Server: vi.fn(function Server() { return api; }),
    Asset: Object.assign(vi.fn(function Asset(code, issuer) { this.code = code; this.issuer = issuer; }), { native: vi.fn(() => ({ type: "native" })) }),
    Operation: { manageSellOffer: vi.fn((value) => ({ type: "manageSellOffer", ...value })) },
    TransactionBuilder: vi.fn(function TransactionBuilder() { return builder; }),
    Networks: { TESTNET: "testnet" },
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: stellar.Asset,
  Horizon: { Server: stellar.Server },
  Keypair: { fromSecret: stellar.fromSecret },
  Networks: stellar.Networks,
  Operation: stellar.Operation,
  TransactionBuilder: stellar.TransactionBuilder,
}));

import { findMatchingOffer, runEnsureTestnetLiquidity } from "./ensure-testnet-liquidity.mjs";

let directory;
let fetchMock;
const issuerSecret = "test-secret";
const env = [
  "VEILPASS_ASSET_CODE=VPT",
  "VEILPASS_ASSET_ISSUER=GISSUER",
  `VEILPASS_ISSUER_SECRET=${issuerSecret}`,
].join("\n");

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "veilpass-liquidity-test-"));
  await writeFile(path.join(directory, ".env.local"), env);
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ _embedded: { records: [] } }) }));
  vi.stubGlobal("fetch", fetchMock);
  stellar.api.loadAccount.mockClear();
  stellar.api.submitTransaction.mockClear();
  stellar.Server.mockClear();
  stellar.fromSecret.mockClear().mockReturnValue({ publicKey: () => "GISSUER" });
  stellar.builder.addOperation.mockClear().mockReturnThis();
  stellar.builder.setTimeout.mockClear().mockReturnThis();
  stellar.transaction.sign.mockClear();
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(directory, { recursive: true, force: true });
});

describe("findMatchingOffer", () => {
  it("finds only the VPT offer selling into native XLM", () => {
    const offers = [
      {
        id: "wrong-direction",
        selling: { asset_type: "native" },
        buying: { asset_code: "VPT", asset_issuer: "GISSUER" },
      },
      {
        id: "vpt-xlm",
        selling: { asset_code: "VPT", asset_issuer: "GISSUER" },
        buying: { asset_type: "native" },
      },
    ];

    expect(findMatchingOffer(offers, "VPT", "GISSUER")?.id).toBe("vpt-xlm");
  });

  it("returns undefined when the issuer has no matching offer", () => {
    expect(findMatchingOffer([], "VPT", "GISSUER")).toBeUndefined();
  });

  it("rejects native XLM and incomplete configuration before contacting Horizon", async () => {
    await writeFile(path.join(directory, ".env.local"), `VEILPASS_ASSET_TYPE=native\n${env}`);
    await expect(runEnsureTestnetLiquidity(directory)).rejects.toThrow("native XLM eligibility needs no issuer liquidity");
    await writeFile(path.join(directory, ".env.local"), "VEILPASS_ASSET_CODE=VPT\n");
    await expect(runEnsureTestnetLiquidity(directory)).rejects.toThrow("Missing VEILPASS_ASSET_ISSUER");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stellar.Server).not.toHaveBeenCalled();
  });

  it("fails closed when Horizon cannot read issuer offers", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    await expect(runEnsureTestnetLiquidity(directory)).rejects.toThrow("Could not read issuer offers (503)");
    expect(stellar.Server).not.toHaveBeenCalled();
  });

  it("creates a native-XLM offer with safe defaults and redacted output", async () => {
    const summary = await runEnsureTestnetLiquidity(directory);
    expect(fetchMock).toHaveBeenCalledWith("https://horizon-testnet.stellar.org/accounts/GISSUER/offers?limit=200");
    expect(stellar.api.loadAccount).toHaveBeenCalledWith("GISSUER");
    expect(stellar.Operation.manageSellOffer).toHaveBeenCalledWith(expect.objectContaining({
      selling: expect.objectContaining({ code: "VPT", issuer: "GISSUER" }),
      buying: { type: "native" }, amount: "100000", price: "1", offerId: "0",
    }));
    expect(stellar.builder.setTimeout).toHaveBeenCalledWith(180);
    expect(stellar.transaction.sign).toHaveBeenCalledWith(expect.objectContaining({ publicKey: expect.any(Function) }));
    expect(stellar.api.submitTransaction).toHaveBeenCalledOnce();
    expect(summary).toContain("Created VPT/XLM Testnet offer");
    expect(summary).toContain("Transaction: tx-hash");
    expect(summary).not.toContain(issuerSecret);
  });

  it("updates a matching offer and honors explicit amount and price", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ _embedded: { records: [{ id: "17", selling: { asset_code: "VPT", asset_issuer: "GISSUER" }, buying: { asset_type: "native" } }] } }) });
    await writeFile(path.join(directory, ".env.local"), `${env}\nVEILPASS_LIQUIDITY_AMOUNT=250\nVEILPASS_VPT_XLM_PRICE=0.5\n`);
    const summary = await runEnsureTestnetLiquidity(directory);
    expect(stellar.Operation.manageSellOffer).toHaveBeenCalledWith(expect.objectContaining({ amount: "250", price: "0.5", offerId: "17" }));
    expect(summary).toContain("Updated VPT/XLM Testnet offer");
    expect(summary).toContain("Rate: 1 VPT = 0.5 XLM");
  });

  it("rejects an issuer secret that does not match the configured asset issuer", async () => {
    stellar.fromSecret.mockReturnValue({ publicKey: () => "GOTHER" });
    await expect(runEnsureTestnetLiquidity(directory)).rejects.toThrow("does not match VEILPASS_ASSET_ISSUER");
    expect(fetchMock).not.toHaveBeenCalled();
  });

});
