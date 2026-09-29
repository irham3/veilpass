import { afterEach, describe, expect, it, vi } from "vitest";

const login = "https://login.example";
const appA = "https://app-a.example";
const appB = "https://app-b.example";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("production acceptance probe", () => {
  it("checks service health, both exact-origin hosts, challenge separation, and hostile-origin rejection", async () => {
    vi.stubEnv("VEILPASS_ACCEPTANCE_LOGIN_ORIGIN", login);
    vi.stubEnv("VEILPASS_ACCEPTANCE_APP_A_ORIGIN", appA);
    vi.stubEnv("VEILPASS_ACCEPTANCE_APP_B_ORIGIN", appB);
    const calls = [];
    vi.stubGlobal("fetch", vi.fn(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      calls.push({ url, init });
      if (url.endsWith("/api/health")) return Response.json({ ok: true });
      if (url === appA || url === appB) return new Response(`Holder dashboard Private feedback ${login}/dashboard/enroll https://veilpass.dev/#two-app-demo`);
      if (url.endsWith("/api/challenges")) {
        const requestOrigin = new Headers(init?.headers).get("Origin");
        if (requestOrigin === "https://untrusted.example") return new Response("{}", { status: 403 });
        return Response.json({ origin: requestOrigin, gateId: "premium-holder", expiresAt: "2030-01-01T00:00:00.000Z" }, { status: 201 });
      }
      throw new Error(`Unexpected acceptance URL ${url}`);
    }));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await import("./production-acceptance.mjs?successful");
    expect(calls).toHaveLength(6);
    expect(JSON.parse(String(log.mock.calls[0]?.[0])).ok).toBe(true);
    log.mockRestore();
  });

  it("rejects a URL that is not an exact HTTPS origin before making a request", async () => {
    vi.stubEnv("VEILPASS_ACCEPTANCE_LOGIN_ORIGIN", "https://login.example/path");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(import("./production-acceptance.mjs?invalid-origin")).rejects.toThrow("must be an exact HTTPS origin");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["health", "Hosted login health check failed"],
    ["host", "App A public host route failed"],
    ["navigation", "navigation is missing https://veilpass.dev/#two-app-demo"],
    ["challenge", "Challenge binding failed"],
    ["same-origin", "Domain separation failed"],
    ["hostile-origin", "Untrusted origin was not rejected"],
    ["malformed-json", "Challenge binding failed"],
    ["native-policy", "Native eligibility must use XLM"],
    ["credit-policy", "Credit eligibility requires an asset issuer"],
  ])("fails safely when the %s acceptance condition is violated", async (scenario, message) => {
    vi.stubEnv("VEILPASS_ACCEPTANCE_LOGIN_ORIGIN", login);
    vi.stubEnv("VEILPASS_ACCEPTANCE_APP_A_ORIGIN", scenario === "same-origin" ? appB : appA);
    vi.stubEnv("VEILPASS_ACCEPTANCE_APP_B_ORIGIN", appB);
    const calls = [];
    vi.stubGlobal("fetch", vi.fn(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      calls.push(url);
      if (url.endsWith("/api/health")) return scenario === "health" ? Response.json({ ok: false }, { status: 503 }) : Response.json({ ok: true });
      if (url === appA || url === appB) {
        if (scenario === "host") return new Response("unavailable", { status: 503 });
        if (scenario === "navigation") return new Response(`Holder dashboard Private feedback ${login}/dashboard/enroll`);
        return new Response(`Holder dashboard Private feedback ${login}/dashboard/enroll https://veilpass.dev/#two-app-demo`);
      }
      if (url.endsWith("/api/challenges")) {
        const requestOrigin = new Headers(init?.headers).get("Origin");
        if (scenario === "challenge") return Response.json({ origin: "https://wrong.example", gateId: "other-gate" }, { status: 400 });
        if (scenario === "malformed-json") return { status: 500, json: async () => { throw new Error("invalid JSON"); } };
        if (requestOrigin === "https://untrusted.example") return scenario === "hostile-origin" ? Response.json({}, { status: 201 }) : new Response("{}", { status: 403 });
        return Response.json({ origin: requestOrigin, gateId: "premium-holder", expiresAt: "2030-01-01T00:00:00.000Z" }, { status: 201 });
      }
      throw new Error(`Unexpected acceptance URL ${url}`);
    }));
    if (scenario === "native-policy") vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_TYPE", "native");
    if (scenario === "native-policy") vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_CODE", "VPT");
    if (scenario === "credit-policy") vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_TYPE", "credit");
    const imports = {
      health: () => import("./production-acceptance.mjs?health"),
      host: () => import("./production-acceptance.mjs?host"),
      navigation: () => import("./production-acceptance.mjs?navigation"),
      challenge: () => import("./production-acceptance.mjs?challenge"),
      "same-origin": () => import("./production-acceptance.mjs?same-origin"),
      "hostile-origin": () => import("./production-acceptance.mjs?hostile-origin"),
      "malformed-json": () => import("./production-acceptance.mjs?malformed-json"),
      "native-policy": () => import("./production-acceptance.mjs?native-policy"),
      "credit-policy": () => import("./production-acceptance.mjs?credit-policy"),
    };
    await expect(imports[scenario]()).rejects.toThrow(message);
  });

  it("uses documented defaults without exposing secrets for a credit-asset deployment", async () => {
    for (const key of ["VEILPASS_ACCEPTANCE_LOGIN_ORIGIN", "VEILPASS_ACCEPTANCE_APP_A_ORIGIN", "VEILPASS_ACCEPTANCE_APP_B_ORIGIN"]) delete process.env[key];
    vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_TYPE", "credit");
    vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_CODE", "VPT");
    vi.stubEnv("VEILPASS_ACCEPTANCE_ASSET_ISSUER", "GISSUER");
    const output = vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn(async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url.endsWith("/api/health")) return Response.json({ ok: true });
      if (url === "https://app-a.veilpass.dev" || url === "https://app-b.veilpass.dev") {
        return new Response("Holder dashboard Private feedback https://login.veilpass.dev/dashboard/enroll https://veilpass.dev/#two-app-demo");
      }
      if (url.endsWith("/api/challenges")) {
        const origin = new Headers(init?.headers).get("Origin");
        if (origin === "https://untrusted.example") return new Response("{}", { status: 403 });
        return Response.json({ origin, gateId: "premium-holder", expiresAt: "2030-01-01T00:00:00.000Z" }, { status: 201 });
      }
      throw new Error(`Unexpected acceptance URL ${url}`);
    }));
    await import("./production-acceptance.mjs?defaults-credit");
    expect(JSON.parse(String(output.mock.calls[0]?.[0])).eligibilityRule).toBe("VPT:GISSUER");
  });
});
