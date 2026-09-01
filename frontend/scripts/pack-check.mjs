import { execFileSync } from "node:child_process";

const packages = ["@veilpass/shared", "@veilpass/sdk", "@veilpass/server", "@veilpass/contract-bindings"];
for (const workspace of packages) {
  const command = `npm pack --workspace ${workspace} --json --dry-run`;
  const executable = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["pack", "--workspace", workspace, "--json", "--dry-run"];
  const output = execFileSync(executable, args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  const [result] = JSON.parse(output);
  const files = result?.files?.map((file) => file.path) ?? [];
  if (!result?.filename || !files.some((file) => file.startsWith("dist/"))) throw new Error(`${workspace} is not publish-ready: dist output is missing from npm pack.`);
  if (!files.includes("README.md") || !files.includes("LICENSE")) throw new Error(`${workspace} is not publish-ready: README.md and LICENSE must be included in npm pack.`);
  process.stdout.write(`✓ ${workspace}: ${result.filename}\n`);
}
