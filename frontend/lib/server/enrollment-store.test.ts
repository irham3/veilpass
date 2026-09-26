import { afterEach, describe, expect, it, vi } from "vitest";

import { EnrollmentStore } from "./enrollment-store";

const input = { address: "GTESTADDRESS", gateId: "premium-holder", origin: "https://login.veilpass.dev" };

afterEach(() => vi.useRealTimers());

describe("in-memory enrollment challenges", () => {
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
