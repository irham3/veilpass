import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadAccount: vi.fn(), submitTransaction: vi.fn(), payment: vi.fn(), sign: vi.fn(), build: vi.fn(),
  transaction: { sign: vi.fn() },
  issuer: { publicKey: vi.fn(() => "GISSUER"), secret: "SSECRET" },
}));

vi.mock("@stellar/stellar-sdk", () => ({
  Asset: class { constructor(readonly code: string, readonly issuer: string) {} },
  Horizon: { Server: class { loadAccount = mocks.loadAccount; submitTransaction = mocks.submitTransaction; } },
  Keypair: { fromSecret: () => mocks.issuer },
  Networks: { TESTNET: "test-network" },
  Operation: { payment: mocks.payment },
  StrKey: { isValidEd25519PublicKey: () => true },
  TransactionBuilder: class {
    addOperation() { return this; }
    setTimeout() { return this; }
    build() { return mocks.build(); }
    static fromXDR(value: string) { return value; }
  },
}));

import { issueDemoAsset } from "./demo-asset-issuer";

afterEach(() => vi.resetAllMocks());

describe("fixed demo asset transfer", () => {
  it("signs and submits exactly the configured payment on Testnet", async () => {
    const transaction = { sign: mocks.sign };
    mocks.build.mockReturnValue(transaction);
    mocks.loadAccount.mockResolvedValue({ id: "issuer-account" });
    mocks.submitTransaction.mockResolvedValue({ hash: "confirmed-hash" });
    await expect(issueDemoAsset({
      config: { assetCode: "VPT", assetIssuer: "GISSUER", amount: "1", issuerSecret: "SSECRET" },
      destination: "GDESTINATION",
    })).resolves.toBe("confirmed-hash");
    expect(mocks.loadAccount).toHaveBeenCalledWith("GISSUER");
    expect(mocks.payment).toHaveBeenCalledWith({ destination: "GDESTINATION", asset: expect.anything(), amount: "1" });
    expect(mocks.sign).toHaveBeenCalledWith(mocks.issuer);
    expect(mocks.submitTransaction).toHaveBeenCalledWith(transaction);
  });
});
