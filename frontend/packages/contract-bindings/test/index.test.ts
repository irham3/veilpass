import { Client as StellarContractClient } from "@stellar/stellar-sdk/contract";
import { Buffer } from "node:buffer";
import { describe, expect, it, vi } from "vitest";

import { Client, Errors } from "../src/index";

describe("generated gate contract bindings", () => {
  it("preserves the Soroban contract error discriminants", () => {
    expect(Errors[1].message).toBe("GateExists");
    expect(Errors[2].message).toBe("GateMissing");
    expect(Errors[3].message).toBe("NotOwner");
    expect(Errors[4].message).toBe("StaleEpoch");
  });

  it("constructs the generated client and exposes every transaction deserializer", () => {
    const client = new Client({ contractId: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", networkPassphrase: "test", rpcUrl: "https://rpc.example" });
    expect(Object.keys(client.fromJSON)).toEqual(["revoke", "get_gate", "is_revoked", "create_gate", "update_root", "rotate_epoch"]);
    expect(client.options.contractId).toBe("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  });

  it("delegates deploy options and wasm hash decoding to the Stellar SDK", async () => {
    const deploy = vi.spyOn(StellarContractClient, "deploy").mockResolvedValue("assembled" as never);
    const options = { wasmHash: Buffer.alloc(32), networkPassphrase: "test", rpcUrl: "https://rpc.example" } as never;
    await expect(Client.deploy(options)).resolves.toBe("assembled");
    expect(deploy).toHaveBeenCalledWith(null, options);
    deploy.mockRestore();
  });
});
