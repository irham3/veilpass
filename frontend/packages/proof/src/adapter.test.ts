import { describe, expect, it, vi } from "vitest";

const { proveMembership } = vi.hoisted(() => ({ proveMembership: vi.fn() }));
vi.mock("./noir", () => ({ proveMembership }));

import { NoirMembershipAdapter } from "./adapter";

describe("Noir membership adapter", () => {
  it("binds proof generation to the requested challenge and gate origin", async () => {
    const adapter = new NoirMembershipAdapter();
    const challenge = { challengeId: "challenge-1", origin: "https://app.example", gateId: "gate" } as never;
    const credential = { gateId: "gate" } as never;
    const result = { proof: "proof", publicInputs: { gateId: "gate", origin: "https://app.example" } } as never;
    proveMembership.mockResolvedValue(result);
    await expect(adapter.prove({ challengeId: "challenge-1", publicInputs: { gateId: "gate", origin: "https://app.example" } as never, witness: { challenge, credential } })).resolves.toBe(result);
    await expect(adapter.prove({ challengeId: "other", publicInputs: {} as never, witness: { challenge, credential } })).rejects.toThrow("bound challenge");
    proveMembership.mockResolvedValueOnce({ publicInputs: { gateId: "other", origin: "https://app.example" } });
    await expect(adapter.prove({ challengeId: "challenge-1", publicInputs: { gateId: "gate", origin: "https://app.example" } as never, witness: { challenge, credential } })).rejects.toThrow("did not match");
    await expect(adapter.verify()).resolves.toBe(false);
  });
});
