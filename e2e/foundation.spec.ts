import { expect, test } from "@playwright/test";

// App level checks for the design system (spec 0003, AC-15).

test("the home page only talks to its own origin", async ({ page }) => {
  const origin = new URL(
    page.url() === "about:blank" ? "http://localhost:3000" : page.url(),
  ).origin;
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== origin)
      foreign.push(request.url());
  });

  await page.goto("/", { waitUntil: "networkidle" });

  expect(
    foreign,
    "requests to another origin (fonts, icons or styles)",
  ).toEqual([]);
});

test("fonts are served from this site", async ({ page }) => {
  const fontUrls: string[] = [];
  page.on("response", (response) => {
    if (/\.woff2?(\?|$)/.test(response.url())) fontUrls.push(response.url());
  });
  await page.goto("/", { waitUntil: "networkidle" });

  expect(fontUrls.length).toBeGreaterThan(0);
  for (const url of fontUrls)
    expect(new URL(url).origin).toBe("http://localhost:3000");
});

test("switching theme stores it in localStorage and sets no cookie", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Dark" }).click();

  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  expect(await context.cookies()).toEqual([]);

  await page.getByRole("radio", { name: "Light" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe(
    "light",
  );
  expect(await context.cookies()).toEqual([]);

  // The choice survives a reload.
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
});

test("the page never flashes the wrong theme, even with scripts blocked", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("theme", "system"));
  // The app's own bundles never load; only the inline theme script can set the class.
  await page.route("**/_next/static/chunks/**", (route) => route.abort());

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).toHaveClass(/dark/);
  await context.close();
});

test("an explicit Light choice beats a dark system setting before any script bundle loads", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.route("**/_next/static/chunks/**", (route) => route.abort());

  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await context.close();
});

test("the skip link is first, shows a 2px outline in forced colors, and moves focus to main", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();

  const outline = await skip.evaluate((el) => {
    const style = getComputedStyle(el);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBe("2px");

  await page.keyboard.press("Enter");
  await expect(page.locator("main#main-content")).toBeFocused();
});

test("there is exactly one main landmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main")).toHaveCount(1);
});
