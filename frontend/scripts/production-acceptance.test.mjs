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
});
