import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { runLocalEnvSetup } from "./local-env.mjs";

describe("local Testnet environment generator", () => {
  it("writes a usable private env file and refuses accidental replacement", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "veilpass-env-test-"));
    const envPath = path.join(directory, ".env.local");
    try {
      const summary = await runLocalEnvSetup(["--host-origin", "http://app-a.localhost:3000", "--login-origin", "http://login.localhost:3000"], directory);
      const contents = await readFile(envPath, "utf8");
      expect(summary).toContain(envPath);
      expect(contents).toContain("VEILPASS_HOST_ORIGIN=http://app-a.localhost:3000");
      expect(contents).toContain("VEILPASS_LOGIN_ORIGIN=http://login.localhost:3000");
      expect(contents).toMatch(/VEILPASS_ISSUER_SECRET=S[A-Z2-7]{55}/);
      await expect(runLocalEnvSetup([], directory)).rejects.toThrow("already exists");
      await expect(runLocalEnvSetup(["--force", "--host-origin"], directory)).rejects.toThrow("Missing value");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
