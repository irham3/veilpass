import { describe, expect, it } from "vitest";

import { Errors } from "../src/index";

describe("generated gate contract bindings", () => {
  it("preserves the Soroban contract error discriminants", () => {
    expect(Errors[1].message).toBe("GateExists");
    expect(Errors[2].message).toBe("GateMissing");
    expect(Errors[3].message).toBe("NotOwner");
    expect(Errors[4].message).toBe("StaleEpoch");
  });
});
