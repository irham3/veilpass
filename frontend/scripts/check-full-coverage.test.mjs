import { describe, expect, it } from "vitest";

import { inspectSourceCoverage } from "./check-full-coverage.mjs";

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
});
