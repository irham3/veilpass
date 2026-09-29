import { afterEach, describe, expect, it, vi } from "vitest";

const { sql } = vi.hoisted(() => {
  const query = Object.assign(vi.fn(), { end: vi.fn(), unsafe: vi.fn() });
  return { sql: query };
});
vi.mock("postgres", () => ({ default: vi.fn(() => sql) }));

let previousSession: unknown;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  if (previousSession === undefined) Reflect.deleteProperty(globalThis, "veilPassSessionStore");
  else Reflect.set(globalThis, "veilPassSessionStore", previousSession);
  previousSession = undefined;
  sql.mockReset().mockResolvedValue([]);
  sql.end.mockReset().mockResolvedValue(undefined);
  sql.unsafe.mockReset();
});

describe("PostgreSQL host session adapter", () => {
  it("stores only the hashed opaque token and reads the unexpired scoped session", async () => {
    previousSession = Reflect.get(globalThis, "veilPassSessionStore");
    Reflect.deleteProperty(globalThis, "veilPassSessionStore");
    vi.stubEnv("DATABASE_URL", "postgresql://host:secret@db.example/veilpass");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { sessionStore } = await import("./session-store");
    const expiresAtMs = Date.now() + 60_000;

    const token = await sessionStore.create({ privateAppId: "vp_private_app", gateId: "premium-holder", expiresAtMs });
    expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(String(sql.mock.calls[0][0])).toContain("insert into veilpass.demo_sessions");
    expect(sql.mock.calls[0]).not.toContain(token);
    expect(sql.end).toHaveBeenCalledOnce();

    sql.mockResolvedValueOnce([{ private_app_id: "vp_private_app", gate_id: "premium-holder", expires_at: new Date(expiresAtMs) }]);
    await expect(sessionStore.read(token)).resolves.toEqual({ privateAppId: "vp_private_app", gateId: "premium-holder", expiresAtMs });
    expect(String(sql.mock.calls[1][0])).toContain("expires_at > now()");
    expect(sql.end).toHaveBeenCalledTimes(2);

    sql.mockResolvedValueOnce([]);
    await expect(sessionStore.read(token)).resolves.toBeNull();
  });

  it("does not persist its singleton on a production serverless runtime", async () => {
    previousSession = Reflect.get(globalThis, "veilPassSessionStore");
    Reflect.deleteProperty(globalThis, "veilPassSessionStore");
    vi.stubEnv("DATABASE_URL", "postgresql://host:secret@db.example/veilpass");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    await import("./session-store");
    expect(Reflect.get(globalThis, "veilPassSessionStore")).toBeUndefined();
  });
});
