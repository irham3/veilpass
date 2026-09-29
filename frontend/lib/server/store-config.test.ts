import { afterEach, describe, expect, it, vi } from "vitest";
import { PostgresChallengeStore } from "./postgres-challenge-store";

const sql = vi.fn();
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete globalThis.veilPassMemoryChallengeStore;
  delete globalThis.veilPassCredentialTreeStore;
  delete globalThis.veilPassDemoAssetClaimStore;
});

describe("production store configuration", () => {
  it("selects durable stores without attaching process-local instances in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://test.invalid/db");

    const challenge = await import("./challenge-store");
    const tree = await import("./credential-tree");
    const claims = await import("./demo-asset-claim-store");

    expect(challenge.durableChallengeStoreConfigured).toBe(true);
    expect(challenge.challengeStore).toBeInstanceOf(PostgresChallengeStore);
    expect(tree.durableCredentialTreeStoreConfigured).toBe(true);
    expect(tree.credentialTreeStore).toBeInstanceOf(tree.PostgresCredentialTreeStore);
    expect(claims.durableDemoAssetClaimStoreConfigured).toBe(true);
    expect(claims.demoAssetClaimStore).toBeInstanceOf(claims.PostgresDemoAssetClaimStore);
    expect(globalThis.veilPassMemoryChallengeStore).toBeUndefined();
    expect(globalThis.veilPassCredentialTreeStore).toBeUndefined();
    expect(globalThis.veilPassDemoAssetClaimStore).toBeUndefined();
  });
});
