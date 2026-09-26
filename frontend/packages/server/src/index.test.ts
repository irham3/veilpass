import { describe, expect, it } from "vitest";

import { verifyVeilPassProof } from "./index";

describe("server package public entry point", () => {
  it("exports the verifier from the documented package root", () => {
    expect(verifyVeilPassProof).toBeTypeOf("function");
  });
});
