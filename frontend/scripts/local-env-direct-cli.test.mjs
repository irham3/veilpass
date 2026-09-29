import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const fs = vi.hoisted(() => ({ existsSync: vi.fn(() => false), writeFile: vi.fn(async () => undefined) }));
vi.mock("node:fs", () => ({ existsSync: fs.existsSync }));
vi.mock("node:fs/promises", () => ({ writeFile: fs.writeFile }));
vi.mock("@stellar/stellar-sdk", () => ({ Keypair: { random: () => ({ secret: () => "S".repeat(56) }) } }));

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.resetModules();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("local env CLI entry point", () => {
  it("prints the safe setup summary and formats both Error and non-Error failures", async () => {
    process.argv = [process.execPath, path.resolve("scripts/local-env.mjs")];
    const output = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("./local-env.mjs");
    await vi.waitFor(() => expect(output).toHaveBeenCalledWith(expect.stringContaining("Wrote ")));
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining(".env.local"), expect.any(String), expect.objectContaining({ flag: "wx", mode: 0o600 }));

    for (const failure of ["disk unavailable", new Error("disk error")]) {
      error.mockClear();
      process.exitCode = originalExitCode;
      vi.resetModules();
      fs.writeFile.mockRejectedValueOnce(failure);
      await import("./local-env.mjs");
      await vi.waitFor(() => expect(error).toHaveBeenCalledWith(failure instanceof Error ? failure.message : failure));
      expect(process.exitCode).toBe(1);
    }
  });
});
