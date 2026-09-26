// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

const { proveMembership } = vi.hoisted(() => ({ proveMembership: vi.fn() }));
vi.mock("./noir", () => ({ proveMembership }));

import "./worker";

describe("proof worker message boundary", () => {
  afterEach(() => vi.restoreAllMocks());

  it("rejects incomplete requests, returns proofs, and normalizes failures", async () => {
    const post = vi.spyOn(self, "postMessage").mockImplementation(() => undefined);
    self.onmessage?.({ data: { id: "bad" } } as MessageEvent);
    expect(post).toHaveBeenLastCalledWith({ id: "bad", ok: false, error: "PROOF_INVALID" });

    proveMembership.mockResolvedValueOnce({ proof: "proof" });
    self.onmessage?.({ data: { id: "ok", challenge: {} as never, credential: {} as never } } as MessageEvent);
    await vi.waitFor(() => expect(post).toHaveBeenLastCalledWith({ id: "ok", ok: true, proof: { proof: "proof" } }));

    proveMembership.mockRejectedValueOnce(new Error("proof generation failed"));
    self.onmessage?.({ data: { id: "failed", challenge: {} as never, credential: {} as never } } as MessageEvent);
    await vi.waitFor(() => expect(post).toHaveBeenLastCalledWith({ id: "failed", ok: false, error: "PROOF_INVALID", message: "proof generation failed" }));
  });
});
