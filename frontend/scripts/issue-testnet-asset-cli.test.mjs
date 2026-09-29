import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stellar = vi.hoisted(() => {
  const api = {
    loadAccount: vi.fn(async (address) => ({ address })),
    submitTransaction: vi.fn(async () => ({ hash: "issued-transaction" })),
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
    fromPublicKey: vi.fn(() => ({ publicKey: () => "GDESTINATION" })),
    Server: vi.fn(function Server() { return api; }),
    Asset: vi.fn(function Asset(code, issuer) { this.code = code; this.issuer = issuer; }),
    Operation: { payment: vi.fn((value) => ({ type: "payment", ...value })) },
    TransactionBuilder: vi.fn(function TransactionBuilder() { return builder; }),
    Networks: { TESTNET: "testnet" },
  };
});

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: stellar.Asset,
  Horizon: { Server: stellar.Server },
  Keypair: { fromSecret: stellar.fromSecret, fromPublicKey: stellar.fromPublicKey },
  Networks: stellar.Networks,
  Operation: stellar.Operation,
  TransactionBuilder: stellar.TransactionBuilder,
}));

import { runIssueTestnetAsset } from "./issue-testnet-asset.mjs";

let directory;
const env = [
  "VEILPASS_ASSET_CODE=VPT",
  "VEILPASS_ASSET_ISSUER=GISSUER",
  "VEILPASS_MIN_BALANCE=2.5",
  "VEILPASS_ISSUER_SECRET=do-not-print-this-secret",
].join("\n");

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "veilpass-asset-issue-test-"));
  await writeFile(path.join(directory, ".env.local"), env);
  stellar.api.loadAccount.mockClear();
  stellar.api.submitTransaction.mockClear();
  stellar.Server.mockClear();
  stellar.fromPublicKey.mockClear().mockReturnValue({ publicKey: () => "GDESTINATION" });
  stellar.fromSecret.mockClear().mockReturnValue({ publicKey: () => "GISSUER" });
  stellar.Operation.payment.mockClear();
  stellar.builder.addOperation.mockClear().mockReturnThis();
  stellar.builder.setTimeout.mockClear().mockReturnThis();
  stellar.transaction.sign.mockClear();
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("asset:issue command orchestration", () => {
  it("requires an explicit destination before reading local configuration", async () => {
    await expect(runIssueTestnetAsset([], directory)).rejects.toThrow("Usage: npm run asset:issue");
    expect(stellar.Server).not.toHaveBeenCalled();
  });

  it("refuses native XLM and missing issuer configuration without network access", async () => {
    await writeFile(path.join(directory, ".env.local"), "VEILPASS_ASSET_TYPE=native\n");
    await expect(runIssueTestnetAsset(["GDESTINATION"], directory)).rejects.toThrow("native XLM eligibility needs no issuer");
    await writeFile(path.join(directory, ".env.local"), "VEILPASS_ASSET_CODE=VPT\n");
    await expect(runIssueTestnetAsset(["GDESTINATION"], directory)).rejects.toThrow("Missing VEILPASS_ASSET_ISSUER");
    expect(stellar.Server).not.toHaveBeenCalled();
  });

  it("rejects a malformed destination and mismatched issuer before submitting", async () => {
    stellar.fromPublicKey.mockImplementation(() => { throw new Error("Invalid public key"); });
    await expect(runIssueTestnetAsset(["not-a-stellar-key"], directory)).rejects.toThrow("Invalid public key");
    stellar.fromPublicKey.mockReturnValue({ publicKey: () => "GDESTINATION" });
    stellar.fromSecret.mockReturnValue({ publicKey: () => "GOTHER" });
    await expect(runIssueTestnetAsset(["GDESTINATION"], directory)).rejects.toThrow("does not match VEILPASS_ASSET_ISSUER");
    expect(stellar.api.submitTransaction).not.toHaveBeenCalled();
  });

  it("submits a bounded Testnet payment and prints only public transaction details", async () => {
    const summary = await runIssueTestnetAsset(["--unused-flag", "GDESTINATION"], directory);
    expect(stellar.fromPublicKey).toHaveBeenCalledWith("GDESTINATION");
    expect(stellar.api.loadAccount).toHaveBeenCalledWith("GISSUER");
    expect(stellar.Operation.payment).toHaveBeenCalledWith(expect.objectContaining({ destination: "GDESTINATION", amount: "2.5" }));
    expect(stellar.builder.setTimeout).toHaveBeenCalledWith(180);
    expect(stellar.transaction.sign).toHaveBeenCalledOnce();
    expect(stellar.api.submitTransaction).toHaveBeenCalledOnce();
    expect(summary).toContain("Issued 2.5 VPT to GDESTINATION");
    expect(summary).toContain("Transaction: issued-transaction");
    expect(summary).not.toContain("do-not-print-this-secret");
  });

  it("executes CLI output and safely formats Error and non-Error failures", async () => {
    const originalArgv = process.argv;
    const originalExitCode = process.exitCode;
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockReadFile = vi.fn(async () => env);
    vi.doMock("node:fs/promises", async (importOriginal) => ({ ...(await importOriginal()), readFile: mockReadFile }));
    process.argv = [process.execPath, path.resolve("scripts/issue-testnet-asset.mjs"), "GDESTINATION"];
    try {
      vi.resetModules();
      await import("./issue-testnet-asset.mjs");
      await vi.waitFor(() => expect(output).toHaveBeenCalledWith(expect.stringContaining("Issued 2.5 VPT to GDESTINATION")));

      for (const failure of ["disk unavailable", new Error("disk error")]) {
        error.mockClear();
        process.exitCode = originalExitCode;
        vi.resetModules();
        mockReadFile.mockRejectedValueOnce(failure);
        await import("./issue-testnet-asset.mjs");
        await vi.waitFor(() => expect(error).toHaveBeenCalledWith(failure instanceof Error ? failure.message : failure));
        expect(process.exitCode).toBe(1);
      }
    } finally {
      process.argv = originalArgv;
      process.exitCode = originalExitCode;
      vi.doUnmock("node:fs/promises");
      vi.resetModules();
      output.mockRestore();
      error.mockRestore();
    }
  });
});
