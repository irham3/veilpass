// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import { VeilPass, VeilPassError } from "./index";

const challenge = {
  challengeId: "challenge-1",
  challenge: "opaque-challenge",
  origin: "https://app.example",
  gateId: "premium-holder",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

const proof = {
  challengeId: "challenge-1",
  proof: "proof-payload",
  publicInputs: {
    gateId: "premium-holder",
    epoch: 1,
    origin: "https://app.example",
    challengeHash: "hash",
    credentialCommitment: "commitment",
    credentialRoot: "root",
    privateAppId: "vp_private",
    loginNullifier: "nullifier",
    revocationHash: "revocation",
    proofCreatedAt: "2029-12-31T23:59:00.000Z",
    proofExpiresAt: "2030-01-01T00:00:00.000Z",
  },
};

const verified = {
  ok: true,
  eligible: true,
  privateAppId: "vp_private",
  gateId: "premium-holder",
  epoch: 1,
  origin: "https://app.example",
  expiresAt: "2030-01-01T00:00:00.000Z",
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("VeilPass browser login", () => {
  it("reports a blocked popup without making a network request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "open").mockReturnValue(null);

    const client = new VeilPass({ loginOrigin: "https://login.example" });

    await expect(client.login({ gateId: "premium-holder" })).rejects.toMatchObject({ code: "POPUP_BLOCKED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a challenge only after the trusted popup is ready, then verifies the proof", async () => {
    const popup = {
      postMessage: vi.fn(),
      close: vi.fn(),
    } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => {
      openedUrl = String(url);
      return popup;
    });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(verified), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new VeilPass({ loginOrigin: "https://login.example" });
    const resultPromise = client.login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(openedUrl).searchParams.get("state");
    expect(state).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://login.example",
      source: popup,
      data: { type: "veilpass:ready", state },
    }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalledWith(
      { type: "veilpass:challenge", state, challenge },
      "https://login.example",
    ));

    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://login.example",
      source: popup,
      data: { type: "veilpass:ready", state },
    }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://login.example",
      source: popup,
      data: { type: "veilpass:proof", state, payload: proof },
    }));

    await expect(resultPromise).resolves.toEqual(verified);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/challenges", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/verify", expect.objectContaining({ method: "POST" }));
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it("normalizes public errors into a typed VeilPassError", () => {
    const error = new VeilPassError("PROOF_INVALID", "Invalid proof");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("VeilPassError");
    expect(error.code).toBe("PROOF_INVALID");
  });

  it("submits a trusted proof only once when the popup repeats its message", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    let resolveVerification!: (response: Response) => void;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), { status: 201 }))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveVerification = resolve; }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder" });
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalled());
    const proofMessage = { type: "veilpass:proof", state, payload: proof };
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: proofMessage }));
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: proofMessage }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    resolveVerification(new Response(JSON.stringify(verified), { status: 200 }));
    await expect(promise).resolves.toEqual(verified);
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it("surfaces challenge creation failures from the trusted login popup", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("challenge service down")));
    const client = new VeilPass({ loginOrigin: "https://login.example" });
    const promise = client.login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://evil.example", source: popup, data: { type: "veilpass:proof", state, payload: proof } }));
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await expect(promise).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "challenge service down" });
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it("rejects verification failures and times out abandoned popups", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "PROOF_INVALID", requestId: "req-1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new VeilPass({ loginOrigin: "https://login.example" });
    const promise = client.login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(String((window.open as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][0])).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalled());
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:proof", state, payload: proof } }));
    await expect(promise).rejects.toMatchObject({ code: "PROOF_INVALID" });

    vi.restoreAllMocks();
    const timeoutPopup = { close: vi.fn() } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(timeoutPopup);
    const timeoutPromise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 1 });
    await expect(timeoutPromise).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(timeoutPopup.close).toHaveBeenCalledOnce();
  });

  it("rejects a popup closed while its challenge request is still resolving", async () => {
    vi.useFakeTimers();
    const popup = { postMessage: vi.fn(), close: vi.fn(), closed: false } as unknown as Window;
    let openedUrl = "";
    let resolveChallenge!: (response: Response) => void;
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveChallenge = resolve; })));

    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const result = promise.then((value) => value, (error: unknown) => error);
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(400);
    (popup as unknown as { closed: boolean }).closed = true;
    resolveChallenge(new Response(JSON.stringify(challenge), { status: 201 }));
    await Promise.resolve();
    await Promise.resolve();
    expect(popup.postMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(400);
    expect(await result).toMatchObject({ code: "POPUP_CLOSED" });
  });

  it("ignores a late challenge failure after the login has timed out", async () => {
    vi.useFakeTimers();
    const popup = { postMessage: vi.fn(), close: vi.fn(), closed: false } as unknown as Window;
    let openedUrl = "";
    let rejectChallenge!: (reason: unknown) => void;
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise<Response>((_, reject) => { rejectChallenge = reject; })));

    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 100 });
    const result = promise.then((value) => value, (error: unknown) => error);
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(100);
    expect(await result).toMatchObject({ code: "TIMEOUT" });
    rejectChallenge(new Error("late challenge failure"));
    await Promise.resolve();
    await Promise.resolve();
    expect(popup.close).toHaveBeenCalledOnce();
  });

  it("normalizes transport failures while verifying a proof", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), { status: 201 }))
      .mockRejectedValueOnce(new Error("verify service down"));
    vi.stubGlobal("fetch", fetchMock);
    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalled());
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:proof", state, payload: proof } }));
    await expect(promise).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "verify service down" });
  });

  it("uses generic messages for non-Error service failures", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    const fetchMock = vi.fn().mockRejectedValue("offline");
    vi.stubGlobal("fetch", fetchMock);
    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await expect(promise).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "Could not create a login challenge" });
  });

  it("uses the generic verification message for non-Error failures", async () => {
    const popup = { postMessage: vi.fn(), close: vi.fn() } as unknown as Window;
    let openedUrl = "";
    vi.spyOn(window, "open").mockImplementation((url) => { openedUrl = String(url); return popup; });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), { status: 201 }))
      .mockRejectedValueOnce("offline"));
    const promise = new VeilPass({ loginOrigin: "https://login.example" }).login({ gateId: "premium-holder", timeoutMs: 5_000 });
    const state = new URL(openedUrl).searchParams.get("state");
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:ready", state } }));
    await vi.waitFor(() => expect(popup.postMessage).toHaveBeenCalled());
    window.dispatchEvent(new MessageEvent("message", { origin: "https://login.example", source: popup, data: { type: "veilpass:proof", state, payload: proof } }));
    await expect(promise).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE", message: "Verification unavailable" });
  });
});
