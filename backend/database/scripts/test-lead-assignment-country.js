import { randomUUID } from "node:crypto";
import { createApp } from "../../src/app.js";

async function parseJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const { app } = createApp();
  const server = app.listen(0);

  const baseUrl = await new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
    server.once("error", reject);
  });

  async function request(path, { method = "GET", headers = {}, body } = {}) {
    const init = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.headers["content-type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const response = await fetch(`${baseUrl}${path}`, init);
    const json = await parseJson(response);
    return { response, json };
  }

  const seed = randomUUID().slice(0, 8);
  const password = "StrongPass123";
  const now = new Date();
  const wall = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const register = await request("/api/auth/register", {
    method: "POST",
    body: {
      fullName: `Country Test Admin ${seed}`,
      email: `country-test-admin-${seed}@example.com`,
      phone: `9199${Math.floor(100000 + Math.random() * 900000)}`,
      password,
      role: "admin",
    },
  });

  const login = await request("/api/auth/login", {
    method: "POST",
    body: {
      email: `country-test-admin-${seed}@example.com`,
      password,
    },
  });

  const token = login.json?.data?.accessToken;
  const authHeaders = token ? { authorization: `Bearer ${token}` } : {};

  const cases = [
    {
      label: "meta_uae_public",
      path: "/api/leads/public-capture",
      headers: {},
      body: {
        fullName: `Meta UAE ${seed}`,
        phone: `9715${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `meta-uae-${seed}@example.com`,
        source: "Meta UAE Page",
        leadCountry: "UAE",
        nationality: "Pakistani",
        leadType: "HOLIDAY",
        budget: 120000,
      },
    },
    {
      label: "meta_india_public",
      path: "/api/leads/public-capture",
      headers: {},
      body: {
        fullName: `Meta India ${seed}`,
        phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `meta-india-${seed}@example.com`,
        source: "Meta India Page",
        leadCountry: "India",
        nationality: "Indian",
        leadType: "HOLIDAY",
        budget: 90000,
      },
    },
    {
      label: "manual_uae_auth",
      path: "/api/leads",
      headers: authHeaders,
      body: {
        fullName: `Manual UAE ${seed}`,
        phone: `9715${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `manual-uae-${seed}@example.com`,
        source: "Manual Entry",
        leadCountry: "United Arab Emirates",
        nationality: "Indian",
        leadType: "HOLIDAY",
        budget: 140000,
        clientCreatedAt: wall,
        clientTimezone: "Asia/Dubai",
      },
    },
    {
      label: "manual_india_auth",
      path: "/api/leads",
      headers: authHeaders,
      body: {
        fullName: `Manual India ${seed}`,
        phone: `9198${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: `manual-india-${seed}@example.com`,
        source: "Manual Entry",
        leadCountry: "India",
        nationality: "Indian",
        leadType: "HOLIDAY",
        budget: 70000,
        clientCreatedAt: wall,
        clientTimezone: "Asia/Kolkata",
      },
    },
  ];

  const results = [];
  for (const testCase of cases) {
    const out = await request(testCase.path, {
      method: "POST",
      headers: testCase.headers,
      body: testCase.body,
    });
    const lead = out.json?.data || null;
    results.push({
      case: testCase.label,
      status: out.response.status,
      leadId: lead?.id || null,
      leadCode: lead?.leadCode || null,
      leadCountry: lead?.leadCountry || lead?.country || null,
      source: lead?.source || null,
      assignedTo: lead?.assignedTo || null,
      assignedUser: lead?.assignedUser?.fullName || null,
      error: out.json?.error || out.json?.message || null,
    });
  }

  await request("/api/leads/distribute", {
    method: "POST",
    headers: authHeaders,
    body: { limit: 20, reason: `country-test-${seed}` },
  });

  for (const item of results) {
    if (!item.leadId) continue;
    const refreshed = await request(`/api/leads/${item.leadId}`, {
      headers: authHeaders,
    });
    const lead = refreshed.json?.data || null;
    item.assignedToAfterDistribute = lead?.assignedTo || null;
    item.assignedUserAfterDistribute = lead?.assignedUser?.fullName || null;
    item.statusAfterDistribute = refreshed.response.status;
  }

  console.log(JSON.stringify({ seed, register: register.response.status, login: login.response.status, results }, null, 2));

  await new Promise((resolve) => server.close(resolve));
}

main().catch((error) => {
  console.error("TEST_FAILED", error?.message || String(error));
  process.exitCode = 1;
});

