import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("landing explains and demonstrates the narrow privacy boundary", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prove access");
  const payload = page.getByTestId("hero-payload");
  await expect(payload).toContainText("walletAddress");
  await page.getByRole("button", { name: "VeilPass login" }).click();
  await expect(payload).not.toContainText("walletAddress");
  await expect(payload).toContainText("privateAppId");
  await expect(page.getByText(/does not provide network anonymity/i)).toBeVisible();
  if (testInfo.project.name === "chromium") await page.screenshot({ path: "docs/evidence/landing-desktop.png", fullPage: true });
});

test("landing FAQ opens privacy and deployment answers", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Questions reviewers ask first" })).toBeVisible();
  await page.getByRole("button", { name: "Does VeilPass make the user anonymous?" }).click();
  await expect(page.getByText("No. The issuer still sees the wallet during enrollment.")).toBeVisible();
  await page.getByRole("button", { name: "Can I deploy this from the frontend folder?" }).click();
  await expect(page.getByText("Yes. Vercel should use frontend as the project root.")).toBeVisible();
});

test("VeilPass owns every browser and install surface", async ({ page, request }) => {
  await page.goto("/");

  const iconHrefs = await page.locator('link[rel="icon"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href),
  );
  expect(iconHrefs.some((href) => href.includes("/icon.svg"))).toBe(true);
  expect(iconHrefs.every((href) => !href.includes("/favicon.ico"))).toBe(true);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);

  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  await expect(manifest.json()).resolves.toMatchObject({
    name: "VeilPass",
    short_name: "VeilPass",
    theme_color: "#0B0F0E",
  });

  for (const templateAsset of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
    expect((await request.get(`/${templateAsset}`)).status()).toBe(404);
  }
});

test("five-step two-origin reviewer script", async ({ page }, testInfo) => {
  await page.goto("/demo");
  if (testInfo.project.name === "chromium") await page.screenshot({ path: "docs/evidence/demo-desktop.png", fullPage: true });
  const payload = page.getByTestId("demo-payload");
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  await expect(payload).toContainText("vp_appA_72f1");
  const appA = await payload.textContent();
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  expect(await payload.textContent()).toBe(appA);
  await page.getByRole("button", { name: /App B/ }).click();
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  await expect(payload).toContainText("vp_appB_19c8");
  expect(await payload.textContent()).not.toBe(appA);
  await page.getByRole("button", { name: "Replay last challenge" }).click();
  await expect(payload).toContainText("CHALLENGE_SPENT");
  await page.getByRole("button", { name: "Revoke credential" }).click();
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  await expect(payload).toContainText("CREDENTIAL_REVOKED");
});

test("host surfaces exclude a known wallet from private login state", async ({ page, context }) => {
  const knownWallet = "GAKNOWNTESTWALLETADDRESSFORPRIVACYASSERTION";
  const consoleEntries: string[] = [];
  const responseBodies: string[] = [];
  page.on("console", (message) => consoleEntries.push(message.text()));
  page.on("response", async (response) => { if (response.url().includes("/api/")) responseBodies.push(await response.text().catch(() => "")); });
  await page.goto("/demo");
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  await page.getByRole("button", { name: /App B/ }).click();
  await page.getByRole("button", { name: "Login with VeilPass" }).click();
  const rendered = await page.locator("body").innerText();
  const local = await page.evaluate(() => JSON.stringify(localStorage));
  const session = await page.evaluate(() => JSON.stringify(sessionStorage));
  const cookies = await context.cookies();
  expect([rendered, local, session, JSON.stringify(cookies), consoleEntries.join("\n"), responseBodies.join("\n")].join("\n")).not.toContain(knownWallet);
});

for (const route of ["/", "/demo", "/dashboard", "/docs"]) {
  test(`@a11y ${route} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  });
}

test("reduced motion disables long transitions", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const reduced = await page.evaluate(() => ({ media: matchMedia("(prefers-reduced-motion: reduce)").matches, duration: getComputedStyle(document.body).animationDuration }));
  expect(reduced.media).toBe(true);
  expect(Number.parseFloat(reduced.duration)).toBeLessThanOrEqual(0.01);
  await context.close();
});

test("security headers and trusted-origin API boundary are enforced", async ({ page, request }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  const rejected = await request.post("/api/challenges", { headers: { Origin: "https://evil.example" }, data: { gateId: "premium-holder" } });
  expect(rejected.status()).toBe(403);
  await expect(rejected.json()).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
});

test("primary surfaces stay within the MVP navigation budget", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Watch one credential");
  await page.goto("/demo");
  const duration = await page.evaluate(() => performance.getEntriesByType("navigation").map((entry) => entry.duration)[0] ?? Number.POSITIVE_INFINITY);
  expect(duration).toBeLessThan(4_000);
});
