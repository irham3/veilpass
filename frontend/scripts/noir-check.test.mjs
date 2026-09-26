import { afterEach, describe, expect, it, vi } from "vitest";

const { execFileSync, existsSync } = vi.hoisted(() => ({ execFileSync: vi.fn(), existsSync: vi.fn(() => true) }));
vi.mock("node:child_process", () => ({ execFileSync }));
vi.mock("node:fs", () => ({ existsSync }));

describe("pinned Noir toolchain launcher", () => {
  const originalPlatform = process.platform;
  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("fails clearly when the circuit workspace is missing", async () => {
    existsSync.mockReturnValue(false);
    await expect(import("./noir-check.mjs?missing")).rejects.toThrow("Circuit directory missing");
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("uses the repository WSL wrapper on Windows", async () => {
    existsSync.mockReturnValue(true);
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    await import("./noir-check.mjs?windows");
    expect(execFileSync).toHaveBeenCalledWith(
      "wsl.exe",
      ["-d", "Ubuntu", "--", "bash", "./scripts/noir-check-wsl.sh"],
      expect.objectContaining({ cwd: process.cwd() }),
    );
  });
});
