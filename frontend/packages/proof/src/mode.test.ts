import { describe, expect, it } from "vitest";

import { simulatedProofsAllowed } from "./mode";

describe("simulatedProofsAllowed", () => {
  it("never permits a forgeable proof adapter in production", () => {
    expect(simulatedProofsAllowed("production")).toBe(false);
  });

  it("keeps the deterministic fixture available for local and test workflows", () => {
    expect(simulatedProofsAllowed("development")).toBe(true);
    expect(simulatedProofsAllowed("test")).toBe(true);
  });
});
