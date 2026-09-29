import { createHash } from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { witnessForCredential, getGatePolicy, durable } = vi.hoisted(() => ({ witnessForCredential: vi.fn(), getGatePolicy: vi.fn(), durable: { value: true } }));
vi.mock("@/lib/server/credential-tree", () => ({ get durableCredentialTreeStoreConfigured() { return durable.value; }, credentialTreeStore: { witnessForCredential } }));
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
  durable.value = true;
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

  it("rejects requests outside the configured origin and malformed credentials", async () => {
    vi.stubEnv("VEILPASS_LOGIN_ORIGIN", "https://login.example");
    const wrongOrigin = new NextRequest("https://login.example/api/credentials/witness", {
      method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    expect((await POST(wrongOrigin)).status).toBe(403);

    vi.stubEnv("VEILPASS_LOGIN_ORIGIN", "http://localhost:3000");
    const invalid = new NextRequest("http://localhost:3000/api/credentials/witness", {
      method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" },
      body: "{",
    });
    expect((await POST(invalid)).status).toBe(400);
    expect(witnessForCredential).not.toHaveBeenCalled();
  });

  it("rejects a disallowed gate before reading issuer or tree state", async () => {
    const response = await POSTWithCredential({ ...credential, gateId: "unknown-gate" });
    expect(response.status).toBe(400);
    expect(witnessForCredential).not.toHaveBeenCalled();
    expect(getGatePolicy).not.toHaveBeenCalled();
  });

  it("requires a parseable matching issuer and a valid issuer signature", async () => {
    vi.stubEnv("VEILPASS_ISSUER_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv("VEILPASS_ISSUER_SECRET", "invalid-secret");
    expect((await POST(request())).status).toBe(503);

    vi.stubEnv("VEILPASS_ISSUER_SECRET", issuer.secret());
    expect((await POSTWithCredential({ ...credential, issuerPublicKey: Keypair.random().publicKey() })).status).toBe(400);
    expect((await POSTWithCredential({ ...credential, issuerSignature: Buffer.alloc(64).toString("base64") })).status).toBe(400);
    expect(getGatePolicy).not.toHaveBeenCalled();
  });

  it("rejects an inactive gate or stale credential epoch", async () => {
    getGatePolicy.mockResolvedValueOnce({ active: false, epoch: 1, credentialRoot: field });
    expect((await POST(request())).status).toBe(400);
    getGatePolicy.mockResolvedValueOnce({ active: true, epoch: 2, credentialRoot: field });
    expect((await POST(request())).status).toBe(400);
    expect(witnessForCredential).not.toHaveBeenCalled();
  });

  it("requires a durable witness store in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    durable.value = false;
    expect((await POST(request())).status).toBe(503);
    expect(getGatePolicy).not.toHaveBeenCalled();
    expect(witnessForCredential).not.toHaveBeenCalled();
  });

  it("maps non-Error tree failures to an opaque unavailable response", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    witnessForCredential.mockRejectedValue("database down");
    expect((await POST(request())).status).toBe(503);
    expect(error).toHaveBeenCalledOnce();
    error.mockRestore();
  });
});

function requestWithCredential(value: unknown) {
  return new NextRequest("http://localhost:3000/api/credentials/witness", {
    method: "POST", headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify({ credential: value }),
  });
}

function POSTWithCredential(value: unknown) {
  return POST(requestWithCredential(value));
}
