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

  it("checks the pinned native tool versions and executes test, prove, and verify", async () => {
    existsSync.mockReturnValue(true);
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    execFileSync.mockImplementation((command) => command === "nargo" ? "nargo version = 1.0.0-beta.22" : "5.0.0-nightly.20260522\n");
    await import("./noir-check.mjs?native");
    expect(execFileSync).toHaveBeenNthCalledWith(1, "nargo", ["--version"], { encoding: "utf8" });
    expect(execFileSync).toHaveBeenNthCalledWith(2, "bb", ["--version"], { encoding: "utf8" });
    expect(execFileSync).toHaveBeenCalledWith("nargo", ["test"], expect.objectContaining({ stdio: "inherit" }));
    expect(execFileSync).toHaveBeenCalledWith("nargo", ["execute"], expect.objectContaining({ stdio: "inherit" }));
    expect(execFileSync.mock.calls.some(([command, args]) => command === "bb" && args[0] === "prove")).toBe(true);
    expect(execFileSync.mock.calls.some(([command, args]) => command === "bb" && args[0] === "verify")).toBe(true);
  });

  it("rejects unpinned Nargo or Barretenberg installations", async () => {
    existsSync.mockReturnValue(true);
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    execFileSync.mockReturnValueOnce("other");
    await expect(import("./noir-check.mjs?nargo-mismatch")).rejects.toThrow("Expected Nargo 1.0.0-beta.22");

    vi.resetModules();
    execFileSync.mockReset().mockImplementation((command) => command === "nargo" ? "nargo version = 1.0.0-beta.22" : "other");
    await expect(import("./noir-check.mjs?bb-mismatch")).rejects.toThrow("Expected Barretenberg 5.0.0-nightly.20260522");
  });

  it("reports a missing Barretenberg version without crashing", async () => {
    existsSync.mockReturnValue(true);
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    execFileSync.mockImplementation((command) => command === "nargo" ? "nargo version = 1.0.0-beta.22" : "");
    await expect(import("./noir-check.mjs?missing-bb-version")).rejects.toThrow("Expected Barretenberg 5.0.0-nightly.20260522; found none");
  });
});
