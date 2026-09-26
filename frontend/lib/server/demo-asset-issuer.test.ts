import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDemoAssetConfig, issueDemoAsset } from "./demo-asset-issuer";

afterEach(() => vi.unstubAllEnvs());

describe("Testnet demo asset issuer", () => {
  it("keeps the optional credit-asset issuer disabled for the native-XLM policy", () => {
    vi.stubEnv("VEILPASS_ASSET_TYPE", "native");
    vi.stubEnv("VEILPASS_ASSET_ISSUER", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF");
    expect(getDemoAssetConfig()).toBeNull();
  });

  it("accepts only a positive, well-formed credit rule whose signer matches its issuer", () => {
    const issuer = Keypair.random();
    vi.stubEnv("VEILPASS_ASSET_TYPE", "credit");
    vi.stubEnv("VEILPASS_ASSET_CODE", "VPT");
    vi.stubEnv("VEILPASS_ASSET_ISSUER", issuer.publicKey());
    vi.stubEnv("VEILPASS_MIN_BALANCE", "1.25");
    vi.stubEnv("VEILPASS_ISSUER_SECRET", issuer.secret());
    expect(getDemoAssetConfig()).toEqual({ assetCode: "VPT", assetIssuer: issuer.publicKey(), amount: "1.25", issuerSecret: issuer.secret() });

    vi.stubEnv("VEILPASS_MIN_BALANCE", "0");
    expect(getDemoAssetConfig()).toBeNull();
    vi.stubEnv("VEILPASS_MIN_BALANCE", "1");
    vi.stubEnv("VEILPASS_ASSET_ISSUER", Keypair.random().publicKey());
    expect(getDemoAssetConfig()).toBeNull();
  });

  it("rejects invalid destinations before contacting Horizon", async () => {
    await expect(issueDemoAsset({ config: { assetCode: "VPT", assetIssuer: "issuer", amount: "1", issuerSecret: "secret" }, destination: "not-a-public-key" })).rejects.toThrow("Invalid Testnet destination");
  });
});
