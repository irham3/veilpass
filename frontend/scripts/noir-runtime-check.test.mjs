import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ readFile: vi.fn(async (path) => String(path).endsWith(".json") ? JSON.stringify({ bytecode: "circuit" }) : new Uint8Array([1, 2, 3])), init: vi.fn(), execute: vi.fn(async () => ({ witness: "witness" })), generateProof: vi.fn(async () => ({ proof: new Uint8Array([1, 2]), publicInputs: ["input"] })), verifyProof: vi.fn(async () => true), destroy: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));
vi.mock("@noir-lang/noir_js", () => ({ Noir: class { init = mocks.init; execute = mocks.execute; constructor(circuit) { this.circuit = circuit; } } }));
vi.mock("@aztec/bb.js", () => ({
  Barretenberg: { new: async () => ({ destroy: mocks.destroy }) },
  UltraHonkBackend: class { generateProof = mocks.generateProof; constructor(bytecode, api) { this.bytecode = bytecode; this.api = api; } },
  UltraHonkVerifierBackend: class { verifyProof = mocks.verifyProof; constructor(api) { this.api = api; } },
}));

describe("pinned browser proof runtime check", () => {
  afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("runs the fixture through Noir, UltraHonk proving, and the committed verification key", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await import("./noir-runtime-check.mjs?valid");
    expect(mocks.execute).toHaveBeenCalledOnce();
    expect(mocks.generateProof).toHaveBeenCalledOnce();
    expect(mocks.verifyProof).toHaveBeenCalledOnce();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(JSON.parse(String(log.mock.calls[0]?.[0])).verified).toBe(true);
    log.mockRestore();
  });

  it("fails when the pinned key rejects the generated proof", async () => {
    mocks.verifyProof.mockResolvedValueOnce(false);
    await expect(import("./noir-runtime-check.mjs?rejected")).rejects.toThrow("Pinned verification key rejected");
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
