import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSync } = vi.hoisted(() => ({ execFileSync: vi.fn(() => JSON.stringify([{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }, { path: "README.md" }, { path: "LICENSE" }] }])) }));
vi.mock("node:child_process", () => ({ execFileSync }));

describe("workspace package publication check", () => {
  const originalPlatform = process.platform;
  const originalComSpec = process.env.ComSpec;
  beforeEach(() => execFileSync.mockReset().mockReturnValue(JSON.stringify([{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }, { path: "README.md" }, { path: "LICENSE" }] }])));
  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    if (originalComSpec === undefined) delete process.env.ComSpec;
    else process.env.ComSpec = originalComSpec;
    vi.resetModules(); vi.clearAllMocks();
  });

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

  it("rejects empty npm pack output before inspecting package contents", async () => {
    execFileSync.mockReturnValue("[]");
    await expect(import("./pack-check.mjs?empty")).rejects.toThrow("dist output is missing");
  });

  it.each([
    ["missing pack filename", [{ files: [{ path: "dist/index.js" }, { path: "README.md" }, { path: "LICENSE" }] }], "dist output is missing"],
    ["missing build output", [{ filename: "fixture.tgz", files: [{ path: "README.md" }, { path: "LICENSE" }] }], "dist output is missing"],
    ["missing readme", [{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }, { path: "LICENSE" }] }], "README.md and LICENSE"],
    ["missing license", [{ filename: "fixture.tgz", files: [{ path: "dist/index.js" }, { path: "README.md" }] }], "README.md and LICENSE"],
  ])("rejects a tarball with %s", async (_label, packed, message) => {
    execFileSync.mockReturnValue(JSON.stringify(packed));
    await expect(import("./pack-check.mjs?artifact-check")).rejects.toThrow(message);
  });

  it("uses npm directly off Windows and the fallback command shell on Windows", async () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "linux" });
    await import("./pack-check.mjs?linux");
    expect(execFileSync).toHaveBeenCalledWith("npm", expect.arrayContaining(["pack", "--workspace", "@veilpass/shared"]), expect.any(Object));

    vi.resetModules();
    vi.clearAllMocks();
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    delete process.env.ComSpec;
    await import("./pack-check.mjs?windows-fallback");
    expect(execFileSync).toHaveBeenCalledWith("cmd.exe", expect.arrayContaining(["/d", "/s", "/c"]), expect.any(Object));
  });
});
