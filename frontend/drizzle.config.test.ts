import { describe, expect, it } from "vitest";

import config from "./drizzle.config";

describe("Drizzle configuration", () => {
  it("targets the VeilPass schema and requires explicit production migrations", () => {
    expect(config).toMatchObject({
      schema: "./lib/db/schema.ts",
      out: "./drizzle",
      dialect: "postgresql",
      schemaFilter: ["veilpass"],
      strict: true,
      verbose: true,
    });
  });
});
