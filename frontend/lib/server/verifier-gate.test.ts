import { afterEach, describe, expect, it, vi } from "vitest";

import { VerifierGate } from "./verifier-gate";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("verifier concurrency gate", () => {
  it("turns a rejected chain lookup into an unavailable result and releases capacity", async () => {
    vi.stubEnv("VERIFIER_MAX_CONCURRENCY", "1");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const gate = new VerifierGate();

    await expect(gate.run(async () => { throw new Error("RPC unavailable"); })).resolves.toBeNull();
    await expect(gate.run(async () => "verified")).resolves.toBe("verified");
  });

  it("keeps an in-flight slot occupied until a timed-out verification actually settles", async () => {
    vi.useFakeTimers();
    vi.stubEnv("VERIFIER_MAX_CONCURRENCY", "1");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const gate = new VerifierGate();
    let finish!: (value: string) => void;
    const first = gate.run(() => new Promise<string>((resolve) => { finish = resolve; }), 100);
    await vi.advanceTimersByTimeAsync(100);
    await expect(first).resolves.toBeNull();
    await expect(gate.run(async () => "blocked")).resolves.toBeNull();

    finish("late");
    await vi.advanceTimersByTimeAsync(0);
    await expect(gate.run(async () => "verified")).resolves.toBe("verified");
  });
});
