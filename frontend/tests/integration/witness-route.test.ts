import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { witnessForCredential, getGatePolicy } = vi.hoisted(() => ({ witnessForCredential: vi.fn(), getGatePolicy: vi.fn() }));
vi.mock("@/lib/server/credential-tree", () => ({ durableCredentialTreeStoreConfigured: true, credentialTreeStore: { witnessForCredential } }));
vi.mock("@/lib/server/gate-policy", () => ({ isAllowedGate: (gateId: string) => gateId === "premium-holder", getGatePolicy }));

import { POST } from "@/app/api/credentials/witness/route";
import { issuedCredentialCanonical } from "@/lib/server/credential-issuance";

const issuer = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 11));
const field = "0".repeat(64);
const unsigned = {
  gateId: "premium-holder", epoch: 1, commitment: "1".repeat(64), credentialSalt: "2".repeat(64),
  credentialRoot: field, leafIndex: 0, leafNonce: "3".repeat(64), merklePath: Array.from({ length: 16 }, () => field),
  pathIsRight: Array.from({ length: 16 }, () => false), revocationHash: "4".repeat(64),
  expiresAt: "2030-01-01T00:00:00.000Z", issuerPublicKey: issuer.publicKey(),
};
const credential = {
  ...unsigned,
  issuerSignature: issuer.sign(createHash("sha256").update(issuedCredentialCanonical(unsigned)).digest()).toString("base64"),
};

function request() {
  return new NextRequest("http://localhost:3000/api/credentials/witness", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({ credential }),
  });
}

beforeEach(() => {
  vi.stubEnv("VEILPASS_LOGIN_ORIGIN", "http://localhost:3000");
  vi.stubEnv("VEILPASS_ISSUER_SECRET", issuer.secret());
  witnessForCredential.mockReset();
  getGatePolicy.mockReset();
  getGatePolicy.mockResolvedValue({ active: true, epoch: 1, credentialRoot: field });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/credentials/witness", () => {
  it("returns a fresh witness for the signed credential", async () => {
    const witness = { credentialRoot: field, leafIndex: 0, leafNonce: unsigned.leafNonce, merklePath: unsigned.merklePath, pathIsRight: unsigned.pathIsRight, revocationHash: unsigned.revocationHash };
    witnessForCredential.mockResolvedValue(witness);
    const response = await POST(request());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(witness);
  });

  it("distinguishes a missing credential from an unavailable tree store", async () => {
    witnessForCredential.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("database offline"));
    const missing = await POST(request());
    expect(missing.status).toBe(400);
    await expect(missing.json()).resolves.toMatchObject({ error: "CREDENTIAL_REVOKED" });

    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const unavailable = await POST(request());
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toMatchObject({ error: "SERVICE_UNAVAILABLE" });
  });

  it("fails closed if the contract policy cannot be read", async () => {
    getGatePolicy.mockRejectedValue(new Error("Invalid contract StrKey checksum"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(witnessForCredential).not.toHaveBeenCalled();
  });
});
