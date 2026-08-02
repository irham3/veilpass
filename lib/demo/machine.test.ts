import { describe, expect, it } from "vitest";

import { createDemoState, runDemoLogin } from "./machine";

describe("controlled demo state machine", () => {
  it("keeps the same private ID for repeat logins at App A", () => {
    const initial = createDemoState();
    const first = runDemoLogin(initial, "app-a");
    const second = runDemoLogin(first.state, "app-a");
    expect(first.result).toMatchObject({ ok: true, privateAppId: "vp_appA_72f1" });
    expect(second.result).toEqual(first.result);
  });

  it("returns a different private ID for App B", () => {
    const initial = createDemoState();
    const appA = runDemoLogin(initial, "app-a");
    const appB = runDemoLogin(appA.state, "app-b");
    expect(appB.result.ok).toBe(true);
    if (!appA.result.ok || !appB.result.ok) throw new Error("Expected successful demo logins");
    expect(appB.result.privateAppId).not.toBe(appA.result.privateAppId);
  });

  it("rejects replaying the previous challenge", () => {
    const first = runDemoLogin(createDemoState(), "app-a");
    const replay = runDemoLogin(first.state, "app-a", { replay: true });
    expect(replay.result).toEqual({ ok: false, error: "CHALLENGE_SPENT", requestId: "demo-replay" });
  });

  it("rejects login after revocation", () => {
    const state = { ...createDemoState(), revoked: true };
    const result = runDemoLogin(state, "app-a");
    expect(result.result).toEqual({ ok: false, error: "CREDENTIAL_REVOKED", requestId: "demo-revoked" });
  });
});
