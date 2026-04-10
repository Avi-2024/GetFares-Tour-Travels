import { test, expect, request as playwrightRequest } from "@playwright/test";

const email =
  process.env.E2E_EMAIL || "admin@travel-crm.com";
const password = process.env.E2E_PASSWORD || "admin@123";

test.describe("Authenticated UI", () => {
  let token = "";
  let user: unknown = null;

  test.beforeAll(async () => {
    const apiBase =
      process.env.PLAYWRIGHT_API_BASE_URL ||
      process.env.VITE_API_BASE_URL ||
      "http://localhost:3000";

    const ctx = await playwrightRequest.newContext();
    const res = await ctx.post(`${apiBase}/api/auth/login`, {
      data: { email, password, rememberMe: true },
      headers: { "Content-Type": "application/json" },
    });
    expect(
      res.ok(),
      `login failed ${res.status()}: ${await res.text()}`,
    ).toBeTruthy();
    const body = (await res.json()) as any;
    token = body?.data?.accessToken || "";
    user = body?.data?.user || null;
    expect(token).toBeTruthy();
    await ctx.dispose();
  });

  test("authenticated UI loads leads and dashboard", async ({ page }) => {
    await page.addInitScript(
      ([accessToken, userPayload]) => {
        window.localStorage.setItem("auth_token", String(accessToken || ""));
        if (userPayload) {
          window.localStorage.setItem(
            "auth_user",
            JSON.stringify(userPayload),
          );
        }
      },
      [token, user],
    );

    await page.goto("/leads");
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(800);

    await page.goto("/dashboard");
    await expect(page.locator("body")).toBeVisible();
  });
});
