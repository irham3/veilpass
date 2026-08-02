import type { VerifyResult } from "@/packages/shared/src/contracts";

export type DemoApp = "app-a" | "app-b";
export type DemoState = { revoked: boolean; loginCount: number; lastChallengeSpent: boolean };

const appResults = {
  "app-a": { privateAppId: "vp_appA_72f1", origin: "http://localhost:3000" },
  "app-b": { privateAppId: "vp_appB_19c8", origin: "http://127.0.0.1:3000" },
} as const;

export function createDemoState(): DemoState { return { revoked: false, loginCount: 0, lastChallengeSpent: false }; }

export function runDemoLogin(state: DemoState, app: DemoApp, options: { replay?: boolean } = {}): { state: DemoState; result: VerifyResult } {
  if (state.revoked) return { state, result: { ok: false, error: "CREDENTIAL_REVOKED", requestId: "demo-revoked" } };
  if (options.replay && state.lastChallengeSpent) return { state, result: { ok: false, error: "CHALLENGE_SPENT", requestId: "demo-replay" } };
  const selected = appResults[app];
  return {
    state: { ...state, loginCount: state.loginCount + 1, lastChallengeSpent: true },
    result: { ok: true, privateAppId: selected.privateAppId, gateId: "premium-holder", epoch: 20391, origin: selected.origin, expiresAt: "2026-08-02T09:00:00.000Z" },
  };
}
