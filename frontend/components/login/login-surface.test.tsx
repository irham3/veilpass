// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, loadCredential } = vi.hoisted(() => ({ push: vi.fn(), loadCredential: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/packages/credential/src/store", () => ({ loadCredential, saveCredential: vi.fn() }));
vi.mock("@/packages/proof/src/noir", () => ({ proveMembership: vi.fn() }));
vi.mock("@/packages/shared/src/contracts", () => ({
  challengeResponseSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
  proofResultSchema: { safeParse: (data: unknown) => ({ success: true, data }) },
}));

import { LoginSurface, witnessFailureMessage } from "./login-surface";

beforeEach(() => { push.mockReset(); loadCredential.mockReset(); });

describe("hosted login witness recovery", () => {
  it("gives distinct recovery paths for stale or invalid local credentials and service outages", () => {
    expect(witnessFailureMessage("CREDENTIAL_REVOKED")).toContain("Re-enroll with Freighter");
    expect(witnessFailureMessage("STALE_EPOCH")).toContain("epoch changed");
    expect(witnessFailureMessage("PROOF_INVALID")).toContain("issuer validation");
    expect(witnessFailureMessage("SERVICE_UNAVAILABLE")).toContain("operator checks the live gate configuration");
  });
});

describe("hosted login recovery action", () => {
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
});
