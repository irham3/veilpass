import { afterEach, describe, expect, it, vi } from "vitest";

import { DemoAssetClaimStore } from "./demo-asset-claim-store";

const address = "GACIPGS6ZFHSK5B2UAI7KHO7QONSDVC2USAP7T4KSMWI5LBFV3WN6RYW";
const input = { address, origin: "https://login.veilpass.dev", assetCode: "VPT", assetIssuer: "GDBCLMMSWLEQIZRTDBZGRQKNZYQBURTJXT6E3GFEQT7LFVC5XOOZHCGU", amount: "1" };

afterEach(() => vi.useRealTimers());

describe("DemoAssetClaimStore", () => {
  it("accepts a matching one-time claim and prevents a second claim for the wallet", async () => {
    const store = new DemoAssetClaimStore();
    const challenge = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: challenge.message, dailyLimit: 100 })).resolves.toMatchObject({ kind: "reserved" });

    const secondChallenge = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: secondChallenge.challengeId, address, message: secondChallenge.message, dailyLimit: 100 })).resolves.toEqual({ kind: "already_claimed" });
  });

  it("rejects a changed message without consuming the valid challenge", async () => {
    const store = new DemoAssetClaimStore();
    const challenge = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: `${challenge.message}\nchanged`, dailyLimit: 100 })).resolves.toEqual({ kind: "challenge_invalid" });
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: challenge.message, dailyLimit: 100 })).resolves.toMatchObject({ kind: "reserved" });
  });

  it("enforces the Testnet daily reservation cap", async () => {
    const store = new DemoAssetClaimStore();
    const first = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: first.challengeId, address, message: first.message, dailyLimit: 1 })).resolves.toMatchObject({ kind: "reserved" });
    const otherAddress = "GBCVQY7BGPVGMCGMGUOA4JNXCQYSI3HNTHGQW7OYGUK7XVJLHOSPILBU";
    const second = await store.issue({ ...input, address: otherAddress });
    await expect(store.consumeAndReserve({ challengeId: second.challengeId, address: otherAddress, message: second.message, dailyLimit: 1 })).resolves.toEqual({ kind: "limit_reached" });
  });

  it("fails closed for unknown, mismatched, and expired challenges", async () => {
    const store = new DemoAssetClaimStore();
    await expect(store.consumeAndReserve({ challengeId: "missing", address, message: "missing", dailyLimit: 100 })).resolves.toEqual({ kind: "challenge_invalid" });

    const challenge = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address: `${address}X`, message: challenge.message, dailyLimit: 100 })).resolves.toEqual({ kind: "challenge_invalid" });
  });

  it("records issued and unknown outcomes only for the matching reservation", async () => {
    const store = new DemoAssetClaimStore();
    const challenge = await store.issue(input);
    const reservation = await store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: challenge.message, dailyLimit: 100 });
    expect(reservation.kind).toBe("reserved");
    if (reservation.kind !== "reserved") throw new Error("Expected reservation");

    await expect(store.markIssued({ address, reservationId: "wrong", transactionHash: "tx-ignored" })).resolves.toBeUndefined();
    await expect(store.markUnknown({ address, reservationId: "wrong" })).resolves.toBeUndefined();
    await expect(store.markUnknown({ address, reservationId: reservation.reservationId })).resolves.toBeUndefined();
    await expect(store.markIssued({ address, reservationId: reservation.reservationId, transactionHash: "tx-final" })).resolves.toBeUndefined();
    await expect(store.markUnknown({ address, reservationId: reservation.reservationId })).resolves.toBeUndefined();
  });

  it("rejects spent and expired challenges before reserving", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T00:00:00.000Z"));
    const store = new DemoAssetClaimStore();
    const challenge = await store.issue(input);
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: challenge.message, dailyLimit: 100 })).resolves.toMatchObject({ kind: "reserved" });
    await expect(store.consumeAndReserve({ challengeId: challenge.challengeId, address, message: challenge.message, dailyLimit: 100 })).resolves.toEqual({ kind: "challenge_invalid" });
    const expired = await store.issue({ ...input, address: `${address}2` });
    vi.advanceTimersByTime(5 * 60_000 + 1);
    await expect(store.consumeAndReserve({ challengeId: expired.challengeId, address: `${address}2`, message: expired.message, dailyLimit: 100 })).resolves.toEqual({ kind: "challenge_invalid" });
  });
});
