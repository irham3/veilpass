import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadEnvConfig = vi.hoisted(() => vi.fn());
vi.mock("@next/env", () => ({ default: { loadEnvConfig } }));

const originalExitCode = process.exitCode;
const issuer = Keypair.random();
const owner = Keypair.random();
function useValidEnvironment() {
  for (const [key, value] of Object.entries({
    VEILPASS_HOST_ORIGIN: "https://app-a.veilpass.dev,https://app-b.veilpass.dev",
    VEILPASS_LOGIN_ORIGIN: "https://login.veilpass.dev",
    NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN: "https://login.veilpass.dev",
    DATABASE_URL: "postgres://veilpass:secret@db.example/veilpass",
    VEILPASS_ISSUER_SECRET: issuer.secret(),
    VEILPASS_GATE_OWNER_SECRET: owner.secret(),
    NEXT_PUBLIC_VEILPASS_CONTRACT_ID: "CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK",
    NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT: owner.publicKey(),
    VEILPASS_ASSET_TYPE: "native",
    VEILPASS_MIN_BALANCE: "1",
  })) vi.stubEnv(key, value);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  process.exitCode = originalExitCode;
});

describe("runtime environment validator", () => {
  it("accepts structurally valid origins, Postgres, keys, contract, and native XLM policy without printing secrets", async () => {
    useValidEnvironment();
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await import("./validate-runtime-env.mjs?valid");
    expect(process.exitCode).toBe(originalExitCode);
    expect(String(output.mock.calls.map(([chunk]) => chunk).join(" "))).toContain("Runtime configuration is structurally valid");
    expect(String(output.mock.calls.map(([chunk]) => chunk).join(" "))).not.toContain(issuer.secret());
    expect(loadEnvConfig).toHaveBeenCalledWith(process.cwd());
    output.mockRestore();
  });

  it("fails on malformed exact-origin configuration", async () => {
    useValidEnvironment();
    vi.stubEnv("VEILPASS_LOGIN_ORIGIN", "https://login.veilpass.dev/path");
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await import("./validate-runtime-env.mjs?invalid");
    expect(process.exitCode).toBe(1);
    expect(output.mock.calls.map(([chunk]) => String(chunk)).join(" ")).toContain("FAIL VEILPASS_LOGIN_ORIGIN");
    output.mockRestore();
  });
});
