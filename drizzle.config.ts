import { defineConfig } from "drizzle-kit";

export default defineConfig({ schema: "./lib/db/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://veilpass:veilpass@localhost:5432/veilpass" }, schemaFilter: ["veilpass"], strict: true, verbose: true });
