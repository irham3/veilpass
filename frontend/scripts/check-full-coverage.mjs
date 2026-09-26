#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Require every executable source module to be exercised by the full suite. */
export function inspectSourceCoverage(report) {
  const modules = Object.entries(report).flatMap(([file, coverage]) => {
    const counters = Object.values(coverage.s ?? {});
    if (counters.length === 0) return [];
    return [{ file, statements: counters.length, covered: counters.filter((count) => count > 0).length }];
  });
  if (modules.length === 0) throw new Error("Coverage report contains no executable source modules");

  const uncoveredModules = modules.filter((module) => module.covered === 0).map((module) => module.file);
  if (uncoveredModules.length > 0) {
    throw new Error(`Executable modules without statement coverage: ${uncoveredModules.join(", ")}`);
  }

  return {
    modules: modules.length,
    coveredStatements: modules.reduce((total, module) => total + module.covered, 0),
    totalStatements: modules.reduce((total, module) => total + module.statements, 0),
  };
}

export async function checkFullSourceCoverage(reportPath = path.resolve("coverage-all/coverage-final.json")) {
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const summary = inspectSourceCoverage(report);
  console.log(`Full-source test inventory: ${summary.modules} executable modules exercised; ${summary.coveredStatements}/${summary.totalStatements} statements hit.`);
  return summary;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkFullSourceCoverage().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
