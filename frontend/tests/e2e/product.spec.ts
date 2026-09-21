import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function revealWholePage(page: Page) {
  const viewportHeight = page.viewportSize()?.height ?? 720;
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += Math.max(320, viewportHeight - 120)) {
    await page.evaluate((position) => window.scrollTo(0, position), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

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
  if (testInfo.project.name === "chromium") {
    await revealWholePage(page);
    await page.screenshot({ path: "docs/evidence/landing-desktop.png", fullPage: true });
  }
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

test("App A and App B resolve as distinct local host origins", async ({ page }) => {
  await page.goto("http://app-a.localhost:3000");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Holder dashboard");
  await expect(page.getByText("http://app-a.localhost:3000", { exact: true })).toBeVisible();

  await page.goto("http://app-b.localhost:3000");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Private feedback");
  await expect(page.getByText("http://app-b.localhost:3000", { exact: true })).toBeVisible();
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

test("@security security headers and trusted-origin API boundary are enforced", async ({ page, request }) => {
  const response = await page.goto("/");
  const headers = response?.headers() ?? {};
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["referrer-policy"]).toBe("no-referrer");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  const rejected = await request.post("/api/challenges", { headers: { Origin: "https://evil.example" }, data: { gateId: "premium-holder" } });
  expect(rejected.status()).toBe(403);
  await expect(rejected.json()).resolves.toMatchObject({ ok: false, error: "ORIGIN_MISMATCH" });
});

test("landing and enrollment explain every Freighter step before the first click", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What happens after you click enroll?" })).toBeVisible();
  await expect(page.getByText("Approve the enrollment message without switching accounts.")).toBeVisible();
  await expect(page.getByText(/not a transaction—and it cannot move your funds/i)).toBeVisible();

  await page.goto("/dashboard/enroll");
  const header = page.locator("header");
  await expect(header.locator('a[href$="/dashboard/enroll"]').first()).toHaveAttribute("href", /dashboard\/enroll$/);
  await expect(header.getByRole("link", { name: "Open App A" })).toHaveCount(0);

  const blockedButton = page.getByRole("button", { name: "Check the box above to continue" });
  await expect(blockedButton).toBeDisabled();
  await expect(page.getByText("First, check the disclosure box directly above the progress panel.")).toBeVisible();
  await page.getByRole("checkbox").click();
  await expect(page.getByRole("button", { name: "Connect Freighter and enroll" })).toBeEnabled();
  await expect(page.getByText("After clicking, watch the Current status panel above")).toBeVisible();
});

test("docs navigation stays oriented without replaying route-entry animation", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.locator(".route-transition")).toHaveCount(0);
  const docsNav = page.getByRole("navigation", { name: "Documentation" });
  await expect(docsNav).toBeVisible();
  await docsNav.getByRole("link", { name: "Enrollment" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Enrollment" })).toBeVisible();
  await expect(docsNav.getByRole("link", { name: "Enrollment" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Before clicking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "If no Freighter window appears" })).toBeVisible();
});

test("@security public APIs reject oversized and structurally hostile input without leaking internals", async ({ request }) => {
  const oversized = await request.post("/api/challenges", {
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    data: { gateId: "premium-holder", padding: "x".repeat(4500) },
  });
  expect(oversized.status()).toBe(400);
  const oversizedBody = await oversized.text();
  expect(oversizedBody).not.toMatch(/stack|postgres|database|secret|node_modules/i);

  const polluted = await request.post("/api/challenges", {
    headers: { Origin: "http://localhost:3000" },
    data: { gateId: "premium-holder", __proto__: { admin: true }, admin: true },
  });
  expect(polluted.status()).toBe(400);
  await expect(polluted.json()).resolves.toMatchObject({ ok: false, error: "GATE_MISMATCH" });
});

test("@security session and error responses are non-cacheable and omit sensitive fields", async ({ request }) => {
  const session = await request.get("/api/session");
  expect(session.status()).toBe(401);
  expect(session.headers()["cache-control"]).toContain("no-store");
  const payload = await session.json();
  expect(payload).toEqual({ authenticated: false });
  expect(JSON.stringify(payload)).not.toMatch(/wallet|token|cookie|stack|secret/i);
});

test("@system landing content survives scrolling, keyboard focus, and viewport constraints", async ({ page }) => {
  await page.goto("/");
  await revealWholePage(page);

  await expect(page.getByRole("heading", { name: "Built to be checked, not believed." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions reviewers ask first" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toHaveCount(1);
});

test("primary surfaces complete an initial render within the server sanity budget", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Watch one credential");
  await page.goto("/demo");
  const duration = await page.evaluate(() => performance.getEntriesByType("navigation").map((entry) => entry.duration)[0] ?? Number.POSITIVE_INFINITY);
  // This is a broad responsiveness guard, not a detailed performance benchmark.
  expect(duration).toBeLessThan(8_000);
});
