import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadEnvConfig = vi.hoisted(() => vi.fn());
vi.mock("@next/env", () => ({ default: { loadEnvConfig } }));

const originalExitCode = process.exitCode;
const issuer = Keypair.random();
const owner = Keypair.random();
function configureValidEnvironment() {
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

async function runValidatorWith(overrides) {
  configureValidEnvironment();
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value);
  const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.resetModules();
  await import("./validate-runtime-env.mjs?scenario");
  return { output, text: output.mock.calls.map(([chunk]) => String(chunk)).join(" ") };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  process.exitCode = originalExitCode;
});

describe("runtime environment validator", () => {
  it("accepts structurally valid origins, Postgres, keys, contract, and native XLM policy without printing secrets", async () => {
    configureValidEnvironment();
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await import("./validate-runtime-env.mjs?valid");
    expect(process.exitCode).toBe(originalExitCode);
    expect(String(output.mock.calls.map(([chunk]) => chunk).join(" "))).toContain("Runtime configuration is structurally valid");
    expect(String(output.mock.calls.map(([chunk]) => chunk).join(" "))).not.toContain(issuer.secret());
    expect(loadEnvConfig).toHaveBeenCalledWith(process.cwd());
    output.mockRestore();
  });

  it("fails on malformed exact-origin configuration", async () => {
    configureValidEnvironment();
    vi.stubEnv("VEILPASS_LOGIN_ORIGIN", "https://login.veilpass.dev/path");
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    await import("./validate-runtime-env.mjs?invalid");
    expect(process.exitCode).toBe(1);
    expect(output.mock.calls.map(([chunk]) => String(chunk)).join(" ")).toContain("FAIL VEILPASS_LOGIN_ORIGIN");
    output.mockRestore();
  });

  it.each([
    ["missing host allowlist", { VEILPASS_HOST_ORIGIN: "" }, "VEILPASS_HOST_ORIGIN"],
    ["duplicate host origins", { VEILPASS_HOST_ORIGIN: "https://app.example,https://app.example" }, "VEILPASS_HOST_ORIGIN"],
    ["host origin with an empty list member", { VEILPASS_HOST_ORIGIN: "https://app.example,,https://other.example" }, "VEILPASS_HOST_ORIGIN"],
    ["credentialed login origin", { VEILPASS_LOGIN_ORIGIN: "https://user:pass@login.example" }, "VEILPASS_LOGIN_ORIGIN"],
    ["passwordless credentialed origin", { VEILPASS_LOGIN_ORIGIN: "https://user@login.example" }, "VEILPASS_LOGIN_ORIGIN"],
    ["query login origin", { VEILPASS_LOGIN_ORIGIN: "https://login.example/?mode=1" }, "VEILPASS_LOGIN_ORIGIN"],
    ["fragment login origin", { VEILPASS_LOGIN_ORIGIN: "https://login.example/#section" }, "VEILPASS_LOGIN_ORIGIN"],
    ["non-HTTP login origin", { VEILPASS_LOGIN_ORIGIN: "ftp://login.example" }, "VEILPASS_LOGIN_ORIGIN"],
    ["normalized login origin with explicit default port", { VEILPASS_LOGIN_ORIGIN: "https://login.example:443" }, "VEILPASS_LOGIN_ORIGIN"],
    ["malformed public login origin", { NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN: "not a URL" }, "NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN"],
    ["unsupported database scheme", { DATABASE_URL: "mysql://u:p@db.example/veilpass" }, "DATABASE_URL"],
    ["unparseable database URL", { DATABASE_URL: "not a url" }, "DATABASE_URL"],
    ["database without a username", { DATABASE_URL: "postgres://db.example/veilpass" }, "DATABASE_URL"],
    ["database without a hostname", { DATABASE_URL: "postgres:///veilpass" }, "DATABASE_URL"],
    ["database without a database path", { DATABASE_URL: "postgres://user:secret@db.example/" }, "DATABASE_URL"],
    ["missing issuer secret", { VEILPASS_ISSUER_SECRET: "" }, "VEILPASS_ISSUER_SECRET"],
    ["invalid gate owner secret", { VEILPASS_GATE_OWNER_SECRET: "not-a-secret" }, "VEILPASS_GATE_OWNER_SECRET"],
    ["invalid contract id", { NEXT_PUBLIC_VEILPASS_CONTRACT_ID: "not-a-contract" }, "NEXT_PUBLIC_VEILPASS_CONTRACT_ID"],
    ["invalid source public key", { NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT: "not-a-public-key" }, "NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT"],
    ["non-positive minimum", { VEILPASS_MIN_BALANCE: "0" }, "VEILPASS_ASSET_RULE"],
    ["non-numeric minimum", { VEILPASS_MIN_BALANCE: "NaN" }, "VEILPASS_ASSET_RULE"],
    ["native rule with non-XLM code", { VEILPASS_ASSET_CODE: "VPT" }, "VEILPASS_ASSET_RULE"],
    ["credit rule without code", { VEILPASS_ASSET_TYPE: "credit", VEILPASS_ASSET_CODE: "" }, "VEILPASS_ASSET_RULE"],
    ["credit rule without issuer", { VEILPASS_ASSET_TYPE: "credit", VEILPASS_ASSET_ISSUER: "" }, "VEILPASS_ASSET_RULE"],
    ["unknown rule type", { VEILPASS_ASSET_TYPE: "other" }, "VEILPASS_ASSET_RULE"],
  ])("rejects %s", async (_label, overrides, key) => {
    const { text } = await runValidatorWith(overrides);
    expect(process.exitCode).toBe(1);
    expect(text).toContain(`FAIL ${key}`);
  });

  it("accepts an inferred credit rule, PostgreSQL URL, and optional native XLM code", async () => {
    const { text } = await runValidatorWith({
      VEILPASS_ASSET_TYPE: "",
      VEILPASS_ASSET_ISSUER: "GISSUER",
      VEILPASS_ASSET_CODE: "VPT",
      DATABASE_URL: "postgresql://veilpass:secret@db.example/veilpass",
      VEILPASS_HOST_ORIGIN: "http://app.example",
    });
    expect(process.exitCode).toBe(originalExitCode);
    expect(text).toContain("Runtime configuration is structurally valid");
  });

  it("uses safe empty defaults when optional configuration variables are absent", async () => {
    configureValidEnvironment();
    for (const key of [
      "VEILPASS_HOST_ORIGIN", "VEILPASS_LOGIN_ORIGIN", "NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN", "DATABASE_URL",
      "VEILPASS_ISSUER_SECRET", "VEILPASS_GATE_OWNER_SECRET", "NEXT_PUBLIC_VEILPASS_CONTRACT_ID",
      "NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT", "VEILPASS_ASSET_TYPE", "VEILPASS_ASSET_ISSUER",
      "VEILPASS_ASSET_CODE", "VEILPASS_MIN_BALANCE",
    ]) delete process.env[key];
    const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.resetModules();
    await import("./validate-runtime-env.mjs?scenario");
    expect(process.exitCode).toBe(1);
    expect(output.mock.calls.map(([chunk]) => String(chunk)).join(" ")).toContain("FAIL VEILPASS_ASSET_RULE");
  });
});
