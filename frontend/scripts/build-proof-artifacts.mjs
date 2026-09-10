import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const circuitDirectory = join(process.cwd(), "packages", "proof", "circuits", "membership");
const target = join(circuitDirectory, "target");
const circuit = join(target, "veilpass_membership.json");
const verificationKey = join(target, "fixture", "vk");
const output = join(process.cwd(), "public", "proof");

// Re-run the pinned toolchain check before publishing any browser artifact.
execFileSync(process.execPath, [join(process.cwd(), "scripts", "noir-check.mjs")], { cwd: process.cwd(), stdio: "inherit" });
if (!existsSync(circuit) || !existsSync(verificationKey)) throw new Error("Pinned Noir build did not produce its circuit artifact and verification key");

await mkdir(output, { recursive: true });
await copyFile(circuit, join(output, "veilpass_membership.json"));
await copyFile(verificationKey, join(output, "veilpass_membership.vk"));
const [circuitBytes, keyBytes] = await Promise.all([readFile(circuit), readFile(verificationKey)]);
await writeFile(join(output, "manifest.json"), `${JSON.stringify({
  noir: "1.0.0-beta.22",
  barretenberg: "5.0.0-nightly.20260522",
  circuitSha256: createHash("sha256").update(circuitBytes).digest("hex"),
  verificationKeySha256: createHash("sha256").update(keyBytes).digest("hex"),
}, null, 2)}\n`);
