// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { validatePopupMessage } from "./channel";

describe("validatePopupMessage", () => {
  const popup = {} as Window;
  const data = {
    type: "veilpass:proof",
    state: "state-1",
    payload: {
      challengeId: "challenge-1",
      proof: "simulated-v1.signature",
      publicInputs: {
        gateId: "gate", epoch: 1, origin: "https://app.example", challengeHash: "hash",
        credentialRoot: "root", privateAppId: "vp_a", loginNullifier: "nullifier",
        revocationHash: "rev", proofExpiresAt: "2026-08-02T09:00:00.000Z",
      },
    },
  };

  it("accepts only the exact source, origin, state, and schema", () => {
    expect(validatePopupMessage({ event: { origin: "https://login.example", source: popup, data } as MessageEvent, popup, loginOrigin: "https://login.example", state: "state-1" })).toEqual(data.payload);
  });

  it("rejects every boundary mismatch", () => {
    const base = { popup, loginOrigin: "https://login.example", state: "state-1" };
    expect(validatePopupMessage({ ...base, event: { origin: "https://evil.example", source: popup, data } as MessageEvent })).toBeNull();
    expect(validatePopupMessage({ ...base, event: { origin: "https://login.example", source: window, data } as unknown as MessageEvent })).toBeNull();
    expect(validatePopupMessage({ ...base, state: "other", event: { origin: "https://login.example", source: popup, data } as MessageEvent })).toBeNull();
    expect(validatePopupMessage({ ...base, event: { origin: "https://login.example", source: popup, data: { ...data, payload: { walletAddress: "G..." } } } as MessageEvent })).toBeNull();
  });
});
