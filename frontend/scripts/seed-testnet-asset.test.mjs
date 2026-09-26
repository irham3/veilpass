import { afterEach, describe, expect, it, vi } from "vitest";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn(async () => "# Legacy fixture is disabled\nVEILPASS_ASSET_TYPE=native\n") }));
vi.mock("node:fs/promises", () => ({ readFile }));

const originalExitCode = process.exitCode;
afterEach(() => { vi.resetModules(); vi.clearAllMocks(); process.exitCode = originalExitCode; });

describe("legacy issued-asset fixture seeder", () => {
  it("fails closed for the native-XLM policy before contacting Horizon", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await import("./seed-testnet-asset.mjs?native");
    await vi.waitFor(() => expect(process.exitCode).toBe(1));
    expect(error.mock.calls[0]?.[0]).toContain("native XLM eligibility needs no issuer");
    expect(readFile).toHaveBeenCalledWith(".env.local", "utf8");
    error.mockRestore();
  });
});
