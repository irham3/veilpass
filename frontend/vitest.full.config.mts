import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

// Audit first-party application, package, script, and runtime configuration
// modules. Browser execution and Rust/Noir need separate coverage instruments.
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
      reportsDirectory: "./coverage-all",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "packages/*/src/**/*.{ts,tsx}",
        "scripts/**/*.mjs",
        "next.config.ts",
        "postcss.config.mjs",
        "drizzle.config.ts",
      ],
      exclude: [
        "**/*.test.{ts,tsx,mjs}",
        "packages/**/dist/**",
      ],
      thresholds: { statements: 0, branches: 0, functions: 0, lines: 0 },
    },
  },
});
