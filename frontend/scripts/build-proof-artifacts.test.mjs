import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  copyFile: vi.fn(async () => undefined), mkdir: vi.fn(async () => undefined), readFile: vi.fn(async (path) => Buffer.from(String(path).includes("fixture") ? "verification-key" : "circuit-artifact")), writeFile: vi.fn(async () => undefined),
  existsSync: vi.fn(() => true), execFileSync: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({ copyFile: mocks.copyFile, mkdir: mocks.mkdir, readFile: mocks.readFile, writeFile: mocks.writeFile }));
vi.mock("node:fs", () => ({ existsSync: mocks.existsSync }));
vi.mock("node:child_process", () => ({ execFileSync: mocks.execFileSync }));

describe("proof artifact publisher", () => {
  afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("copies the pinned circuit and VK, then writes a content-hash manifest", async () => {
    await import("./build-proof-artifacts.mjs?success");
    expect(mocks.execFileSync).toHaveBeenCalledOnce();
    expect(mocks.existsSync).toHaveBeenCalledTimes(2);
    expect(mocks.mkdir).toHaveBeenCalledOnce();
    expect(mocks.copyFile).toHaveBeenCalledTimes(2);
    const manifest = String(mocks.writeFile.mock.calls[0]?.[1]);
    expect(JSON.parse(manifest)).toMatchObject({ noir: "1.0.0-beta.22", barretenberg: "5.0.0-nightly.20260522" });
    expect(JSON.parse(manifest).circuitSha256).toHaveLength(64);
    expect(JSON.parse(manifest).verificationKeySha256).toHaveLength(64);
  });

  it("stops if the pinned build does not produce the circuit or VK", async () => {
    mocks.existsSync.mockReturnValueOnce(false);
    await expect(import("./build-proof-artifacts.mjs?missing")).rejects.toThrow("did not produce its circuit artifact");
    expect(mocks.copyFile).not.toHaveBeenCalled();
  });
});
