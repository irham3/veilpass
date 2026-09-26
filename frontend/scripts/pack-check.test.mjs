import { afterEach, describe, expect, it, vi } from "vitest";

const { execFileSync } = vi.hoisted(() => ({ execFileSync: vi.fn(() => JSON.stringify([{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }, { path: "README.md" }, { path: "LICENSE" }] }])) }));
vi.mock("node:child_process", () => ({ execFileSync }));

describe("workspace package publication check", () => {
  afterEach(() => { vi.resetModules(); vi.clearAllMocks(); });

  it("checks every public workspace tarball for build output and required metadata", async () => {
    const log = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await import("./pack-check.mjs?valid");
    expect(execFileSync).toHaveBeenCalledTimes(4);
    expect(log).toHaveBeenCalledTimes(4);
    log.mockRestore();
  });

  it("rejects a package whose README or license would be missing", async () => {
    execFileSync.mockReturnValue(JSON.stringify([{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }] }]));
    await expect(import("./pack-check.mjs?invalid")).rejects.toThrow("README.md and LICENSE");
  });
});
