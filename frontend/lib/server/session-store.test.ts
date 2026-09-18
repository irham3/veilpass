import { afterEach, describe, expect, it } from "vitest";

import { sessionStore } from "./session-store";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("in-memory session store", () => {
  it("uses a high-entropy opaque token and returns only minimized session data", async () => {
    delete process.env.DATABASE_URL;
    const input = {
      privateAppId: "vp_private_test",
      gateId: "premium-holder",
      expiresAtMs: Date.now() + 60_000,
    };

    const token = await sessionStore.create(input);

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toContain(input.privateAppId);
    await expect(sessionStore.read(token)).resolves.toEqual(input);
  });

  it("fails closed for unknown and expired tokens", async () => {
    delete process.env.DATABASE_URL;
    await expect(sessionStore.read("unknown-token")).resolves.toBeNull();

    const expired = await sessionStore.create({
      privateAppId: "vp_expired",
      gateId: "premium-holder",
      expiresAtMs: Date.now() - 1,
    });
    await expect(sessionStore.read(expired)).resolves.toBeNull();
  });
});
