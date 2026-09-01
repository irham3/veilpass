import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const version = "1.0.0-beta.22";
const bbVersion = "5.0.0-nightly.20260522";
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
  const installedBb = execFileSync("bb", ["--version"], { encoding: "utf8" }).trim();
  if (installedBb !== bbVersion) throw new Error(`Expected Barretenberg ${bbVersion}; found ${installedBb || "none"}`);
  run("nargo", ["test"]);
  run("nargo", ["execute"]);
  const output = join(circuitDirectory, "target", "fixture");
  run("bb", ["prove", "-b", "./target/veilpass_membership.json", "-w", "./target/veilpass_membership.gz", "--write_vk", "-o", output]);
  run("bb", ["verify", "-p", join(output, "proof"), "-k", join(output, "vk"), "-i", join(output, "public_inputs")]);
}
