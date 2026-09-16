import { describe, expect, it } from "vitest";

import { DemoAssetClaimStore } from "./demo-asset-claim-store";

const address = "GACIPGS6ZFHSK5B2UAI7KHO7QONSDVC2USAP7T4KSMWI5LBFV3WN6RYW";
const input = { address, origin: "https://login.veilpass.dev", assetCode: "VPT", assetIssuer: "GDBCLMMSWLEQIZRTDBZGRQKNZYQBURTJXT6E3GFEQT7LFVC5XOOZHCGU", amount: "1" };

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
});
