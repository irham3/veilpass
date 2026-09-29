import { afterEach, describe, expect, it, vi } from "vitest";

import { EnrollmentStore } from "./enrollment-store";

const input = { address: "GTESTADDRESS", gateId: "premium-holder", origin: "https://login.veilpass.dev" };

afterEach(() => vi.useRealTimers());

describe("in-memory enrollment challenges", () => {
  it("selects memory or durable storage correctly during production startup", async () => {
    const previousStore = globalThis.veilPassEnrollmentStore;
    const sql = { begin: vi.fn(), unsafe: vi.fn() };
    const postgresFactory = vi.fn(() => sql);
    try {
      delete globalThis.veilPassEnrollmentStore;
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DATABASE_URL", "");
      vi.resetModules();
      const memoryModulePath = "./enrollment-store?production-memory";
      const memoryModule = await import(memoryModulePath);
      expect(memoryModule.durableEnrollmentStoreConfigured).toBe(false);
      expect(memoryModule.enrollmentStore).toBeInstanceOf(memoryModule.EnrollmentStore);
      expect(globalThis.veilPassEnrollmentStore).toBeUndefined();

      vi.doMock("postgres", () => ({ default: postgresFactory }));
      vi.stubEnv("DATABASE_URL", "postgres://veilpass:test@localhost/veilpass");
      vi.resetModules();
      const postgresModulePath = "./enrollment-store?production-postgres";
      const postgresModule = await import(postgresModulePath);
      expect(postgresModule.durableEnrollmentStoreConfigured).toBe(true);
      expect(postgresModule.enrollmentStore).toBeInstanceOf(postgresModule.PostgresEnrollmentStore);
      expect(postgresFactory).toHaveBeenCalledWith("postgres://veilpass:test@localhost/veilpass", expect.any(Object));
      expect(globalThis.veilPassEnrollmentStore).toBeUndefined();
    } finally {
      if (previousStore) globalThis.veilPassEnrollmentStore = previousStore;
      else delete globalThis.veilPassEnrollmentStore;
      vi.doUnmock("postgres");
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("binds a fresh five-minute message to the login origin and gate and consumes it once", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T10:00:00.000Z"));
    const store = new EnrollmentStore();
    const first = await store.issue(input);
    const second = await store.issue(input);
    expect(first.challengeId).not.toBe(second.challengeId);
    expect(first.message).toContain("origin:https://login.veilpass.dev\ngate:premium-holder\nnonce:");
    expect(first.message).not.toBe(second.message);
    expect(first.expiresAt).toBe("2026-09-25T10:05:00.000Z");

    const claim = { challengeId: first.challengeId, address: input.address, gateId: input.gateId, message: first.message };
    expect(await store.consume(claim)).toBe(true);
    expect(await store.consume(claim)).toBe(false);
    expect(await store.consume({ ...claim, challengeId: second.challengeId, message: second.message })).toBe(true);
  });

  it("rejects unknown, mismatched, and expired challenges without spending a valid one", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T10:00:00.000Z"));
    const store = new EnrollmentStore();
    const issued = await store.issue(input);
    const claim = { challengeId: issued.challengeId, address: input.address, gateId: input.gateId, message: issued.message };

    expect(await store.consume({ ...claim, challengeId: "unknown" })).toBe(false);
    expect(await store.consume({ ...claim, address: "different" })).toBe(false);
    expect(await store.consume({ ...claim, gateId: "different" })).toBe(false);
    expect(await store.consume({ ...claim, message: "different" })).toBe(false);
    expect(await store.consume(claim)).toBe(true);

    const later = await store.issue(input);
    vi.advanceTimersByTime(5 * 60_000);
    expect(await store.consume({ challengeId: later.challengeId, address: input.address, gateId: input.gateId, message: later.message })).toBe(false);
  });
});
