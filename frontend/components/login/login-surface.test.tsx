// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push, loadCredential, saveCredential, proveMembership, challengeParse, proofParse } = vi.hoisted(() => ({
  push: vi.fn(), loadCredential: vi.fn(), saveCredential: vi.fn(), proveMembership: vi.fn(),
  challengeParse: vi.fn((data: unknown) => ({ success: true, data })), proofParse: vi.fn((data: unknown) => ({ success: true, data })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/packages/credential/src/store", () => ({ loadCredential, saveCredential }));
vi.mock("@/packages/proof/src/noir", () => ({ proveMembership }));
vi.mock("@/packages/shared/src/contracts", () => ({
  challengeResponseSchema: { safeParse: challengeParse },
  proofResultSchema: { safeParse: proofParse },
}));

import { LoginSurface, witnessFailureMessage } from "./login-surface";

beforeEach(() => {
  push.mockReset(); loadCredential.mockReset(); saveCredential.mockReset(); proveMembership.mockReset();
  challengeParse.mockReset().mockImplementation((data) => ({ success: true, data }));
  proofParse.mockReset().mockImplementation((data) => ({ success: true, data }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "opener", { configurable: true, value: null });
});

describe("hosted login witness recovery", () => {
  it("gives distinct recovery paths for stale or invalid local credentials and service outages", () => {
    expect(witnessFailureMessage("CREDENTIAL_REVOKED")).toContain("Re-enroll with Freighter");
    expect(witnessFailureMessage("STALE_EPOCH")).toContain("epoch changed");
    expect(witnessFailureMessage("PROOF_INVALID")).toContain("issuer validation");
    expect(witnessFailureMessage("SERVICE_UNAVAILABLE")).toContain("operator checks the live gate configuration");
  });
});

describe("hosted login recovery action", () => {
  it("ignores messages with the wrong origin, source, type, or state", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    vi.stubGlobal("setInterval", vi.fn(() => 0));
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    const data = { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } };
    for (const event of [
      { origin: "https://evil.example", source: opener, data },
      { origin: "https://app-a.veilpass.dev", source: {} as Window, data },
      { origin: "https://app-a.veilpass.dev", source: opener, data: { ...data, type: "other" } },
      { origin: "https://app-a.veilpass.dev", source: opener, data: { ...data, state: "other" } },
    ]) {
      window.dispatchEvent(new MessageEvent("message", { ...event, source: event.source as Window }));
    }
    expect(screen.getByRole("status")).toHaveTextContent("Connecting securely to the host app");
    expect(screen.getByRole("button", { name: "Connecting to host app" })).toBeDisabled();
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Secure challenge received");
  });

  it("offers re-enrollment after a credential is absent from the active witness tree", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "CREDENTIAL_REVOKED" }) }));

    render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    const retry = await screen.findByRole("button", { name: "Re-enroll this browser" });
    expect(screen.getByRole("status")).toHaveTextContent("absent from the active gate tree");
    fireEvent.click(retry);
    await waitFor(() => expect(push).toHaveBeenCalledWith(expect.stringContaining("/dashboard/enroll?returnTo=")));
    vi.unstubAllGlobals();
    Object.defineProperty(window, "opener", { configurable: true, value: null });
  });

  it("refreshes, saves, proves, and sends the exact verified result to its host", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    const credential = {
      gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64), credentialSalt: "2".repeat(64),
      credentialRoot: "3".repeat(64), leafIndex: 0, leafNonce: "4".repeat(64), merklePath: Array(16).fill("5".repeat(64)),
      pathIsRight: Array(16).fill(false), revocationHash: "6".repeat(64), expiresAt: "2030-01-01T00:00:00.000Z",
      issuerPublicKey: "GISSUER", issuerSignature: "signature", subjectSecret: "private", storedAt: "2026-09-29T00:00:00.000Z",
    };
    const witness = { credentialRoot: "7".repeat(64), leafIndex: 1, leafNonce: "8".repeat(64), merklePath: Array(16).fill("9".repeat(64)), pathIsRight: Array(16).fill(true), revocationHash: "a".repeat(64) };
    const result = { challengeId: "challenge-1", proof: "proof", publicInputs: { gateId: "premium-holder" } };
    loadCredential.mockResolvedValue(credential);
    proveMembership.mockResolvedValue(result);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => witness }));
    render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    await waitFor(() => expect(opener.postMessage).toHaveBeenCalledWith({ type: "veilpass:proof", state: "state-1", payload: result }, "https://app-a.veilpass.dev"));
    expect(saveCredential).toHaveBeenCalledWith(expect.objectContaining({ ...credential, ...witness }));
    expect(proveMembership).toHaveBeenCalledWith(expect.objectContaining({ credential: expect.objectContaining(witness) }));
    expect(screen.getByRole("status")).toHaveTextContent("Proof sent to the host verifier");
  });

  it("does not start a proof twice when the continuation button is activated rapidly", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({
      gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64), credentialSalt: "2".repeat(64),
      credentialRoot: "3".repeat(64), leafIndex: 0, leafNonce: "4".repeat(64), merklePath: Array(16).fill("5".repeat(64)),
      pathIsRight: Array(16).fill(false), revocationHash: "6".repeat(64), expiresAt: "2030-01-01T00:00:00.000Z",
      issuerPublicKey: "GISSUER", issuerSignature: "signature", subjectSecret: "private", storedAt: "2026-09-29T00:00:00.000Z",
    });
    saveCredential.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      credentialRoot: "7".repeat(64), leafIndex: 1, leafNonce: "8".repeat(64), merklePath: Array(16).fill("9".repeat(64)),
      pathIsRight: Array(16).fill(true), revocationHash: "a".repeat(64),
    }) }));
    let finishProof!: (proof: unknown) => void;
    proveMembership.mockImplementation(() => new Promise((resolve) => { finishProof = resolve; }));
    render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    const continueButton = await screen.findByRole("button", { name: "Continue with local credential" });

    act(() => {
      fireEvent.click(continueButton);
      fireEvent.click(continueButton);
    });

    await waitFor(() => expect(proveMembership).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledOnce();
    await act(async () => finishProof({ challengeId: "challenge-1", proof: "proof", publicInputs: {} }));
    expect(opener.postMessage.mock.calls.filter(([message]) => message.type === "veilpass:proof")).toHaveLength(1);
  });

  it("does nothing if the opener closes after the challenge is already available", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    const continueButton = await screen.findByRole("button", { name: "Continue with local credential" });
    Object.defineProperty(window, "opener", { configurable: true, value: null });
    fireEvent.click(continueButton);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(proveMembership).not.toHaveBeenCalled();
  });

  it("reports an invalid host challenge and recovers when local storage is unavailable", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    const { unmount } = render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "other-gate", origin: "https://app-a.veilpass.dev" } },
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Challenge binding rejected");
    unmount();

    loadCredential.mockRejectedValue(new Error("IndexedDB unavailable"));
    render(<LoginSurface gateId="premium-holder" state="state-2" hostOrigin="https://app-a.veilpass.dev" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Local credential storage is unavailable");
  });

  it("reports a lost popup connection and rejects malformed host challenge data", async () => {
    Object.defineProperty(window, "opener", { configurable: true, value: null });
    loadCredential.mockResolvedValue(null);
    const { unmount } = render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("lost its connection to the host app");
    expect(screen.getByRole("button", { name: "Enroll this browser" })).toBeDisabled();
    unmount();

    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    challengeParse.mockReturnValueOnce({ success: false, data: null } as never);
    render(<LoginSurface gateId="premium-holder" state="state-2" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-2", challenge: null },
    }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Challenge binding rejected");
  });

  it("handles invalid witness JSON, witness shapes, and proof results safely", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 7 }) });
    vi.stubGlobal("fetch", fetchMock);
    const { unmount } = render(<LoginSurface gateId="premium-holder" state="state-1" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-1", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    expect(await screen.findByRole("status")).toHaveTextContent("credential witness service is unavailable");
    unmount();

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const second = render(<LoginSurface gateId="premium-holder" state="state-2" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-2", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    expect(await screen.findByRole("status")).toHaveTextContent("witness service returned an invalid response");
    second.unmount();

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({
      credentialRoot: "3".repeat(64), leafIndex: 0, leafNonce: "4".repeat(64), merklePath: Array(16).fill("5".repeat(64)), pathIsRight: Array(16).fill(false), revocationHash: "6".repeat(64),
    }) });
    proofParse.mockReturnValueOnce({ success: false, data: null } as never);
    proveMembership.mockResolvedValueOnce({});
    const third = render(<LoginSurface gateId="premium-holder" state="state-3" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-3", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Local proof had an invalid response shape");
    third.unmount();
  });

  it("contains witness JSON parse failures and non-Error proof failures", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("invalid json"); } }));
    const { unmount } = render(<LoginSurface gateId="premium-holder" state="state-json" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-json", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    expect(await screen.findByRole("status")).toHaveTextContent("credential witness service is unavailable");
    unmount();

    let resolveCredential!: (value: unknown) => void;
    const pending = new Promise<unknown>((resolve) => { resolveCredential = resolve; });
    loadCredential.mockReturnValueOnce(pending);
    const late = render(<LoginSurface gateId="premium-holder" state="state-late" hostOrigin="https://app-a.veilpass.dev" />);
    late.unmount();
    resolveCredential({ gateId: "premium-holder" });
    await Promise.resolve();
    await Promise.resolve();

    let rejectCredential!: (error: unknown) => void;
    loadCredential.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectCredential = reject; }));
    const failedLate = render(<LoginSurface gateId="premium-holder" state="state-failed-late" hostOrigin="https://app-a.veilpass.dev" />);
    failedLate.unmount();
    rejectCredential(new Error("storage closed"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("uses a safe fallback for non-Error proof failures", async () => {
    const opener = { postMessage: vi.fn() };
    Object.defineProperty(window, "opener", { configurable: true, value: opener });
    loadCredential.mockResolvedValue({ gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64) });
    proveMembership.mockRejectedValueOnce("worker crashed");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      credentialRoot: "7".repeat(64), leafIndex: 1, leafNonce: "8".repeat(64), merklePath: Array(16).fill("9".repeat(64)), pathIsRight: Array(16).fill(true), revocationHash: "a".repeat(64),
    }) }));
    render(<LoginSurface gateId="premium-holder" state="state-worker-error" hostOrigin="https://app-a.veilpass.dev" />);
    await screen.findByText("Available in IndexedDB");
    window.dispatchEvent(new MessageEvent("message", {
      origin: "https://app-a.veilpass.dev", source: opener as unknown as Window,
      data: { type: "veilpass:challenge", state: "state-worker-error", challenge: { gateId: "premium-holder", origin: "https://app-a.veilpass.dev" } },
    }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue with local credential" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Local proof generation failed");
  });
});
