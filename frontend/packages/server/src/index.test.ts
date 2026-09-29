import { describe, expect, it } from "vitest";

import { verifyVeilPassProof } from "./index";

describe("server package entry point", () => {
  it("exposes the documented proof verifier through the package root", () => {
    expect(verifyVeilPassProof).toBeTypeOf("function");
  });
});
