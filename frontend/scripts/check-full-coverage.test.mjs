import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkFullSourceCoverage, inspectSourceCoverage } from "./check-full-coverage.mjs";

const temporaryPaths = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe("full-source coverage inventory gate", () => {
  it("counts executable modules and statement hits while ignoring type-only files", () => {
    expect(inspectSourceCoverage({
      "app/page.tsx": { s: { 0: 1, 1: 4 } },
      "lib/types.ts": { s: {} },
    })).toEqual({ modules: 1, coveredStatements: 2, totalStatements: 2 });
  });

  it("rejects executable modules that no test reached", () => {
    expect(() => inspectSourceCoverage({ "components/uncovered.tsx": { s: { 0: 0, 1: 0 } } }))
      .toThrow("Executable modules without statement coverage: components/uncovered.tsx");
  });

  it("fails when the coverage report has no executable sources", () => {
    expect(() => inspectSourceCoverage({ "lib/types.ts": { s: {} } }))
      .toThrow("Coverage report contains no executable source modules");
  });

  it("reads and reports a concrete coverage artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "veilpass-coverage-"));
    temporaryPaths.push(directory);
    const reportPath = join(directory, "report.json");
    await writeFile(reportPath, JSON.stringify({ "app/page.tsx": { s: { 0: 1 } } }));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(checkFullSourceCoverage(reportPath)).resolves.toEqual({ modules: 1, coveredStatements: 1, totalStatements: 1 });
    expect(log).toHaveBeenCalledWith("Full-source test inventory: 1 executable modules exercised; 1/1 statements hit.");
  });

  it("runs as a CLI and returns a failing exit code for untouched executable modules", async () => {
    const directory = await mkdtemp(join(tmpdir(), "veilpass-coverage-cli-"));
    temporaryPaths.push(directory);
    await mkdir(join(directory, "coverage-all"));
    await writeFile(join(directory, "coverage-all", "coverage-final.json"), JSON.stringify({ "app/unused.ts": { s: { 0: 0 } } }));
    const script = join(process.cwd(), "scripts", "check-full-coverage.mjs");
    const result = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Executable modules without statement coverage: app/unused.ts");
  });
});
