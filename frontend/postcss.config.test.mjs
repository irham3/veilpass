import { describe, expect, it } from "vitest";
import config from "./postcss.config.mjs";

describe("PostCSS build configuration", () => {
  it("runs Tailwind's PostCSS plugin", () => {
    expect(Object.keys(config.plugins)).toEqual(["@tailwindcss/postcss"]);
    expect(config.plugins["@tailwindcss/postcss"]).toEqual({});
  });
});
