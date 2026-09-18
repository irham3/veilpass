import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("./tests/server-only.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "lib/**/*.ts",
        "packages/shared/src/**/*.ts",
        "packages/sdk/src/**/*.ts",
        "packages/server/src/**/*.ts",
        "packages/proof/src/mode.ts",
        "components/marketing/**/*.tsx",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "lib/db/**",
        "lib/server/postgres-*.ts",
        "lib/server/enrollment-store.ts",
        "lib/server/root-publisher.ts",
        "lib/server/verifier-gate.ts",
        "lib/server/zk-verifier.ts",
        "lib/server/demo-asset-issuer.ts",
        "packages/**/dist/**",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
