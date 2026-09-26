import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const frontendRoot = process.cwd();
const repositoryRoot = join(frontendRoot, "..");

function read(relativePath: string, root = frontendRoot) {
  return readFileSync(join(root, relativePath), "utf8");
}

function routeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(path) : entry.name === "route.ts" ? [path] : [];
  });
}

function endpointFromRoute(path: string): string[] {
  const source = readFileSync(path, "utf8");
  const route = relative(join(frontendRoot, "app", "api"), path)
    .split(sep)
    .slice(0, -1)
    .join("/");
  return [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)]
    .map((match) => `${match[1]} /api/${route}`);
}

describe("published and hosted docs stay aligned with the implementation", () => {
  const hostedDocs = read("lib/docs/content.ts");
  const githubReadme = read("README.md", repositoryRoot);
  const landingPrivacy = read("components/marketing/privacy-boundary.tsx");
  const structuredFaq = read("lib/seo.ts");
  const llmsText = read("public/llms.txt");
  const pricing = read("public/pricing.md");
  const changelog = read("CHANGELOG.md", repositoryRoot);

  it("document every implemented API method and path on both public references", () => {
    const endpoints = routeFiles(join(frontendRoot, "app", "api")).flatMap(endpointFromRoute);
    const normalizedGithubReadme = githubReadme.replace(/[|`]/g, " ").replace(/\s+/g, " ");
    expect(endpoints.length).toBeGreaterThan(0);
    for (const endpoint of endpoints) {
      expect(hostedDocs, `Website docs are missing ${endpoint}`).toContain(endpoint);
      expect(normalizedGithubReadme, `GitHub README is missing ${endpoint}`).toContain(endpoint);
    }
  });

  it("keeps the privacy claim and sensitive proof handling explicit", () => {
    for (const docs of [hostedDocs, githubReadme, llmsText, pricing]) {
      expect(docs).toMatch(/not an anonymity system|not.*anonymity/i);
      expect(docs).toContain("wallet address");
      expect(docs).toContain("proof");
      expect(docs).toMatch(/not log|never log|do not log|no.*log/i);
    }
    expect(landingPrivacy).toContain("proof and public inputs");
    expect(landingPrivacy).toContain("never log");
    expect(structuredFaq).toContain("host's POST /api/verify endpoint");
    expect(llmsText).not.toContain("host does not receive the wallet address, raw proof");
    expect(hostedDocs).toContain("credentialCommitment");
    expect(hostedDocs).toContain("revocationHash");
    expect(hostedDocs).toContain("loginNullifier");
    expect(hostedDocs).toContain("POST /api/challenges");
    expect(hostedDocs).toContain("POST /api/verify");
  });

  it("ships complete package-root READMEs and documents the declared public API", () => {
    const packageDirectories = ["shared", "sdk", "server", "contract-bindings"];
    for (const directory of packageDirectories) {
      const packageDirectory = join(frontendRoot, "packages", directory);
      const metadata = JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8")) as {
        name: string;
        version: string;
        homepage?: string;
        files?: string[];
        exports?: Record<string, unknown>;
      };
      const packageReadme = readFileSync(join(packageDirectory, "README.md"), "utf8");
      expect(packageReadme, `${metadata.name} README needs a package-specific title`).toContain(`# \`${metadata.name}\``);
      expect(packageReadme, `${metadata.name} README must state its status/version`).toContain(metadata.version);
      expect(metadata.files, `${metadata.name} tarball must include its README`).toContain("README.md");
      expect(packageReadme, `${metadata.name} docs must disclose its operational/security scope`).toMatch(/security|production|testnet/i);
      expect(metadata.homepage, `${metadata.name} npm metadata needs a public documentation link`).toMatch(/^https:\/\/veilpass\.dev\/docs\//);

      for (const exportPath of Object.keys(metadata.exports ?? {})) {
        const specifier = exportPath === "." ? metadata.name : `${metadata.name}${exportPath.slice(1)}`;
        expect(packageReadme, `${metadata.name} README is missing export ${specifier}`).toContain(specifier);
      }
    }

    expect(read("packages/sdk/README.md")).toContain("/api/challenges");
    expect(read("packages/sdk/README.md")).toContain("/api/verify");
    expect(read("packages/server/README.md")).toContain("atomically");
    expect(read("packages/shared/README.md")).toContain("verifyResultSchema");
    expect(read("packages/contract-bindings/README.md")).not.toContain("INSERT_RPC_URL_HERE");
    expect(hostedDocs).toContain("https://www.npmjs.com/package/@veilpass/sdk");
    expect(llmsText).toContain("https://www.npmjs.com/package/@veilpass/server");
    expect(changelog).toContain("## [0.2.1]");
  });
});
