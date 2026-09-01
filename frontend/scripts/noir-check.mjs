import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const version = "1.0.0-beta.26";
const circuitDirectory = join(process.cwd(), "packages", "proof", "circuits", "membership");

function run(command, args, options = {}) {
  execFileSync(command, args, { cwd: circuitDirectory, stdio: "inherit", ...options });
}

if (!existsSync(circuitDirectory)) throw new Error(`Circuit directory missing: ${circuitDirectory}`);

if (process.platform === "win32") {
  run("wsl.exe", ["-d", "Ubuntu", "--", "bash", "/mnt/d/Work/00/Veilpass/frontend/scripts/noir-check-wsl.sh"], { cwd: process.cwd() });
} else {
  const installed = execFileSync("nargo", ["--version"], { encoding: "utf8" }).match(/nargo version = ([^\s]+)/)?.[1];
  if (installed !== version) throw new Error(`Expected Nargo ${version}; found ${installed ?? "none"}`);
  run("nargo", ["compile"]);
}
