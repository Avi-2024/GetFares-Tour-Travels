import { test, expect, request as playwrightRequest } from "@playwright/test";

const apiBase =
  process.env.PLAYWRIGHT_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

const email =
  process.env.E2E_EMAIL || "admin@travel-crm.com";
const password = process.env.E2E_PASSWORD || "admin@123";

async function loginForToken(request: import("@playwright/test").APIRequestContext) {
  const res = await request.post(`${apiBase}/api/auth/login`, {
    data: { email, password, rememberMe: true },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.ok(), `login failed ${res.status()}: ${await res.text()}`).toBeTruthy();
  const body = (await res.json()) as {
    data?: { accessToken?: string };
  };
  const token = body?.data?.accessToken;
  expect(token, "missing accessToken in login response").toBeTruthy();
  return token as string;
}

test.describe("API smoke (backend)", () => {
  let token: string;

  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext();
    token = await loginForToken(ctx);
    await ctx.dispose();
  });

  test("health + auth + module GETs", async ({ request }) => {
    const health = await request.get(`${apiBase}/health`);
    expect(health.ok(), `health ${health.status()}`).toBeTruthy();

    const authHeader = { Authorization: `Bearer ${token}` };

    const endpoints: Array<{ path: string; minStatus?: number }> = [
      { path: "/api/auth/me" },
      { path: "/api/leads?page=1&limit=5" },
      { path: "/api/bookings?page=1&limit=5" },
      { path: "/api/quotations?page=1&limit=5" },
      { path: "/api/payments?page=1&limit=5" },
      { path: "/api/refunds?page=1&limit=5" },
      { path: "/api/customers?page=1&limit=5" },
      { path: "/api/complaints?page=1&limit=5" },
      { path: "/api/campaigns?page=1&limit=5" },
      { path: "/api/visa?page=1&limit=5" },
      { path: "/api/destinations?page=1&limit=5" },
      { path: "/api/packages?page=1&limit=5" },
      { path: "/api/suppliers?page=1&limit=5" },
      { path: "/api/countries?page=1&limit=50" },
      { path: "/api/users?page=1&limit=5" },
      { path: "/api/dashboard/stats" },
      { path: "/api/dashboard/revenue" },
      { path: "/api/dashboard/lead-sources" },
      { path: "/api/notifications?page=1&limit=5", minStatus: 200 },
      { path: "/api/settings", minStatus: 200 },
    ];

    const failures: string[] = [];
    for (const { path, minStatus = 200 } of endpoints) {
      const res = await request.get(`${apiBase}${path}`, { headers: authHeader });
      if (res.status() < minStatus || res.status() >= 500) {
        failures.push(`${path} -> ${res.status()} ${(await res.text()).slice(0, 120)}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("create lead via API (minimal payload)", async ({ request }) => {
    const res = await request.post(`${apiBase}/api/leads`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        fullName: `E2E Lead ${Date.now()}`,
        email: `e2e.${Date.now()}@example.com`,
        phone: "+919876543210",
        leadCountry: "India",
        nationality: "Indian",
        leadType: "HOLIDAY",
        source: "Website",
        status: "OPEN",
      },
    });
    expect(
      res.ok() || res.status() === 201,
      `create lead ${res.status()}: ${await res.text()}`,
    ).toBeTruthy();
  });
});
