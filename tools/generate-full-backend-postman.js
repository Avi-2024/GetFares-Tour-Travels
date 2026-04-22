const fs = require("fs");

function loadJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeUrl(raw, query = []) {
  return {
    raw,
    query: query.map((item) => ({ key: item.key, value: String(item.value) })),
  };
}

function jsonBody(body) {
  return {
    mode: "raw",
    raw: JSON.stringify(body, null, 2),
    options: { raw: { language: "json" } },
  };
}

function baseHeaders(extra = []) {
  return [{ key: "Accept", value: "application/json" }, ...extra];
}

function request({
  name,
  method,
  raw,
  query = [],
  body,
  description,
  headers = [],
  auth,
  events = [],
}) {
  const req = {
    name,
    request: {
      method,
      header: baseHeaders(headers),
      url: makeUrl(raw, query),
      ...(description ? { description } : {}),
      ...(auth ? { auth } : {}),
    },
    response: [],
  };

  if (body) {
    req.request.body = body;
    if (body.mode === "raw") {
      req.request.header.push({ key: "Content-Type", value: "application/json" });
    }
  }

  if (events.length) {
    req.event = events;
  }

  return req;
}

function folder(name, items, extra = {}) {
  return { name, item: items, ...extra };
}

function getAllRequests(items, trail = [], output = []) {
  for (const item of items || []) {
    if (item.item) {
      getAllRequests(item.item, [...trail, item.name], output);
      continue;
    }
    output.push({ item, trail });
  }
  return output;
}

function stripBase(raw) {
  return raw.replace("{{baseUrl}}", "");
}

function isPublicRoute(raw) {
  const path = stripBase(raw);
  return (
    path.startsWith("/health") ||
    path.startsWith("/metrics") ||
    path.startsWith("/api/auth/login") ||
    path.startsWith("/api/auth/register") ||
    path.startsWith("/api/currency") ||
    path.startsWith("/api/webhooks") ||
    path.startsWith("/api/website-enquiries") ||
    path.startsWith("/webhook") ||
    path.startsWith("/public/cms") ||
    path.startsWith("/api/public/cms")
  );
}

function ensureHeader(headers, key, value) {
  if (!Array.isArray(headers)) {
    return [{ key, value }];
  }
  if (!headers.some((header) => header.key?.toLowerCase() === key.toLowerCase())) {
    headers.push({ key, value });
  }
  return headers;
}

function defaultDescription(method, raw, publicRoute, inferred = false) {
  const parts = [
    `${method} ${stripBase(raw)}`,
    publicRoute ? "Auth: No auth." : "Auth: Bearer token.",
  ];
  if (inferred) {
    parts.push("Assumption: Request example inferred from code validation and controller flow.");
  }
  return parts.join("\n\n");
}

function getEntityVariable(raw) {
  const path = stripBase(raw).split("?")[0];
  const mappings = [
    ["/api/leads", "leadId"],
    ["/api/lead-activities", "leadActivityId"],
    ["/api/quotations", "quotationId"],
    ["/api/bookings", "bookingId"],
    ["/api/payments", "paymentId"],
    ["/api/refunds", "refundId"],
    ["/api/customers", "customerId"],
    ["/api/campaigns", "campaignId"],
    ["/api/destinations", "crmDestinationId"],
    ["/api/packages", "crmPackageId"],
    ["/api/suppliers", "supplierId"],
    ["/api/countries", "countryId"],
    ["/api/users", "createdUserId"],
    ["/api/employees", "employeeId"],
    ["/api/complaints", "complaintId"],
    ["/api/visa", "visaCaseId"],
    ["/api/history", "historyId"],
    ["/cms/destinations", "destinationId"],
    ["/cms/packages/published", "packageId"],
    ["/cms/packages/main", "mainPackageId"],
    ["/cms/packages/sub", "subPackageId"],
    ["/cms/visa", "visaId"],
    ["/cms/experience/featured-picks", "featuredPickId"],
    ["/cms/experience/creative-toolkit", "featuredPickId"],
    ["/cms/experience/season-cards", "seasonCardId"],
    ["/cms/media", "mediaId"],
    ["/cms", "landingId"],
  ];

  for (const [prefix, variable] of mappings) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return variable;
    }
  }

  return "id";
}

function makeGenericSuccessExample(req, inferred = false) {
  const method = req.request.method;
  const raw = req.request.url.raw;
  const publicRoute = isPublicRoute(raw);

  if (stripBase(raw).startsWith("/health")) {
    return {
      name: "Success",
      originalRequest: deepClone(req.request),
      status: "OK",
      code: 200,
      _postman_previewlanguage: "json",
      header: [{ key: "Content-Type", value: "application/json" }],
      cookie: [],
      body: JSON.stringify(
        {
          status: "ok",
          service: "travel-crm",
        },
        null,
        2,
      ),
    };
  }

  if (stripBase(raw).startsWith("/metrics")) {
    return {
      name: "Success",
      originalRequest: deepClone(req.request),
      status: "OK",
      code: 200,
      _postman_previewlanguage: "text",
      header: [{ key: "Content-Type", value: "text/plain" }],
      cookie: [],
      body: "# HELP http_requests_total total requests\n",
    };
  }

  if (stripBase(raw) === "/api/auth/login" || stripBase(raw) === "/api/auth/register") {
    return {
      name: "Success",
      originalRequest: deepClone(req.request),
      status: method === "POST" ? "Created" : "OK",
      code: method === "POST" ? 201 : 200,
      _postman_previewlanguage: "json",
      header: [{ key: "Content-Type", value: "application/json" }],
      cookie: [],
      body: JSON.stringify(
        {
          data: {
            accessToken: "{{authToken}}",
            user: {
              id: "{{userId}}",
              email: "{{cmsEmail}}",
            },
          },
        },
        null,
        2,
      ),
    };
  }

  if (method === "GET") {
    return {
      name: "Success",
      originalRequest: deepClone(req.request),
      status: "OK",
      code: 200,
      _postman_previewlanguage: "json",
      header: [{ key: "Content-Type", value: "application/json" }],
      cookie: [],
      body: JSON.stringify(
        {
          data: [],
          ...(publicRoute || inferred ? { success: true } : {}),
        },
        null,
        2,
      ),
    };
  }

  if (method === "DELETE") {
    return {
      name: "Success",
      originalRequest: deepClone(req.request),
      status: "OK",
      code: 200,
      _postman_previewlanguage: "json",
      header: [{ key: "Content-Type", value: "application/json" }],
      cookie: [],
      body: JSON.stringify({ success: true }, null, 2),
    };
  }

  return {
    name: "Success",
    originalRequest: deepClone(req.request),
    status: method === "POST" ? "Created" : "OK",
    code: method === "POST" ? 201 : 200,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    cookie: [],
    body: JSON.stringify(
      {
        data: {
          id: `{{${getEntityVariable(raw)}}}`,
        },
        success: true,
      },
      null,
      2,
    ),
  };
}

function makeGenericErrorExample(req, code = 400, name = "Validation Error") {
  return {
    name,
    originalRequest: deepClone(req.request),
    status: code === 401 ? "Unauthorized" : code === 404 ? "Not Found" : "Bad Request",
    code,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    cookie: [],
    body: JSON.stringify(
      {
        error: {
          message:
            code === 401
              ? "Access token is required"
              : code === 404
                ? "Resource not found"
                : "Validation failure",
          code:
            code === 401
              ? "AUTH_TOKEN_REQUIRED"
              : code === 404
                ? "NOT_FOUND"
                : "VALIDATION_ERROR",
          requestId: "example-request-id",
        },
      },
      null,
      2,
    ),
  };
}

function appendScript(item, listen, lines) {
  if (!item.event) {
    item.event = [];
  }
  const existing = item.event.find((entry) => entry.listen === listen);
  if (existing) {
    existing.script.exec = Array.from(new Set([...(existing.script.exec || []), ...lines]));
    return;
  }
  item.event.push({
    listen,
    script: { type: "text/javascript", exec: lines },
  });
}

function addRuntimeEnhancements(collection) {
  const requests = getAllRequests(collection.item);

  for (const { item, trail } of requests) {
    const req = item.request;
    const raw = req.url?.raw || "";
    const inferred = Boolean(item.__inferred);
    const publicRoute = isPublicRoute(raw);
    req.header = ensureHeader(req.header, "Accept", "application/json");

    if (req.body?.mode === "raw") {
      req.header = ensureHeader(req.header, "Content-Type", "application/json");
    }

    if (!req.description) {
      req.description = defaultDescription(req.method, raw, publicRoute, inferred);
    }

    if (publicRoute) {
      req.auth = { type: "noauth" };
    }

    const testLines = [];

    if (trail.includes("Negative Cases")) {
      testLines.push(
        "pm.test('Negative response returned', function () { pm.expect(pm.response.code).to.be.at.least(400); });",
      );
    } else {
      testLines.push(
        "pm.test('Status is success', function () { pm.expect(pm.response.code).to.be.below(400); });",
      );
    }

    if (stripBase(raw) === "/api/auth/login" || stripBase(raw) === "/api/auth/register") {
      testLines.push(
        "try {",
        "  const payload = pm.response.json();",
        "  const token = payload?.data?.accessToken || payload?.accessToken || payload?.token;",
        "  const userId = payload?.data?.user?.id || payload?.user?.id;",
        "  if (token) {",
        "    pm.collectionVariables.set('authToken', token);",
        "    pm.collectionVariables.set('cmsToken', token);",
        "  }",
        "  if (userId) pm.collectionVariables.set('userId', userId);",
        "} catch (e) {}",
      );
    } else if (
      req.method === "POST" ||
      req.method === "PUT" ||
      req.method === "PATCH"
    ) {
      const variable = getEntityVariable(raw);
      testLines.push(
        "try {",
        "  const payload = pm.response.json();",
        "  const data = payload?.data || payload;",
        `  if (data?.id) pm.collectionVariables.set('${variable}', data.id);`,
        "  if (data?.id) pm.collectionVariables.set('id', data.id);",
        "} catch (e) {}",
      );
    }

    appendScript(item, "test", testLines);

    if (!Array.isArray(item.response) || item.response.length === 0) {
      item.response = [
        makeGenericSuccessExample(item, inferred),
        makeGenericErrorExample(item),
      ];
      if (!publicRoute) {
        item.response.push(makeGenericErrorExample(item, 401, "Unauthorized"));
      }
    }
    delete item.__inferred;
  }
}

function makeManualFolders() {
  const health = folder("Health", [
    request({
      name: "GET /health",
      method: "GET",
      raw: "{{baseUrl}}/health",
      description: "Application health status.",
      auth: { type: "noauth" },
    }),
    request({
      name: "GET /health/live",
      method: "GET",
      raw: "{{baseUrl}}/health/live",
      description: "Liveness probe.",
      auth: { type: "noauth" },
    }),
    request({
      name: "GET /health/ready",
      method: "GET",
      raw: "{{baseUrl}}/health/ready",
      description: "Readiness probe with database check.",
      auth: { type: "noauth" },
    }),
  ]);

  const metrics = folder("Metrics", [
    request({
      name: "GET /metrics",
      method: "GET",
      raw: "{{baseUrl}}/metrics",
      description: "Prometheus metrics. Requires `x-metrics-token` when configured.",
      headers: [{ key: "x-metrics-token", value: "{{metricsToken}}" }],
      auth: { type: "noauth" },
    }),
    request({
      name: "GET /metrics/json",
      method: "GET",
      raw: "{{baseUrl}}/metrics/json",
      description: "Metrics snapshot JSON. Requires `x-metrics-token` when configured.",
      headers: [{ key: "x-metrics-token", value: "{{metricsToken}}" }],
      auth: { type: "noauth" },
    }),
  ]);

  const currency = folder("Currency", [
    request({
      name: "GET /api/currency/rates",
      method: "GET",
      raw: "{{baseUrl}}/api/currency/rates",
      description: "Public exchange-rate cache endpoint.",
      auth: { type: "noauth" },
    }),
    request({
      name: "GET /api/currency/convert",
      method: "GET",
      raw: "{{baseUrl}}/api/currency/convert?amount=100&from=AED&to=INR",
      query: [
        { key: "amount", value: "100" },
        { key: "from", value: "AED" },
        { key: "to", value: "INR" },
      ],
      description: "Public currency conversion endpoint.",
      auth: { type: "noauth" },
    }),
  ]);

  const history = folder("History", [
    request({
      name: "POST /api/history",
      method: "POST",
      raw: "{{baseUrl}}/api/history",
      body: jsonBody({
        created_at: "2026-04-17 18:30:00",
        timezone: "Asia/Calcutta",
      }),
      description: "Create fixed-time history record.",
      auth: undefined,
    }),
    request({
      name: "GET /api/history",
      method: "GET",
      raw: "{{baseUrl}}/api/history?limit=20",
      query: [{ key: "limit", value: "20" }],
      description: "List fixed-time history records.",
      auth: undefined,
    }),
  ]);

  history.item.forEach((item) => {
    item.__inferred = true;
  });

  const leadActivities = folder("Lead Activities", [
    request({
      name: "POST /api/lead-activities",
      method: "POST",
      raw: "{{baseUrl}}/api/lead-activities",
      body: jsonBody({
        lead_id: "{{leadId}}",
        notes: "Activity note",
        created_at: "2026-04-17 18:45:00",
        timezone: "Asia/Calcutta",
        activity_type: "CALL",
      }),
      description: "Create lead activity wall-clock record.",
    }),
    request({
      name: "GET /api/lead-activities",
      method: "GET",
      raw: "{{baseUrl}}/api/lead-activities?lead_id={{leadId}}",
      query: [{ key: "lead_id", value: "{{leadId}}" }],
      description: "List lead activity history by lead ID.",
    }),
  ]);

  leadActivities.item.forEach((item) => {
    item.__inferred = true;
  });

  const websiteEnquiries = folder("Website Enquiries", [
    request({
      name: "POST /api/website-enquiries/capture",
      method: "POST",
      raw: "{{baseUrl}}/api/website-enquiries/capture",
      body: jsonBody({
        fullName: "Website Lead",
        email: "website.lead@example.com",
        phone: "919999999999",
        destination: "Maldives",
        nationality: "Indian",
        country: "India",
        travelDate: "2026-05-01",
        budget: 250000,
        numberOfDays: 5,
        numberOfTravellers: 2,
        message: "Need a honeymoon itinerary",
        leadType: "HOLIDAY",
        source: "Website",
        sourcePage: "help-and-support",
        pageUrl: "https://localhost:5174/help-and-support",
        pagePath: "/help-and-support",
        utmSource: "google",
        utmMedium: "cpc",
        utmCampaign: "summer-2026",
        clientCreatedAt: "2026-04-17 18:55:00",
        clientTimezone: "Asia/Calcutta",
      }),
      description: "Public website enquiry capture endpoint.",
      auth: { type: "noauth" },
    }),
  ]);

  websiteEnquiries.item.forEach((item) => {
    item.__inferred = true;
  });

  const negative = folder("Negative Cases", [
    request({
      name: "Auth - Invalid Login",
      method: "POST",
      raw: "{{baseUrl}}/api/auth/login",
      body: jsonBody({
        email: "invalid@example.com",
        password: "wrong-password",
      }),
      description: "Expected 401 invalid credentials.",
      auth: { type: "noauth" },
    }),
    request({
      name: "Auth - Unauthorized Me",
      method: "GET",
      raw: "{{baseUrl}}/api/auth/me",
      description: "Expected 401 when bearer token is missing.",
      auth: { type: "noauth" },
    }),
    request({
      name: "Leads - Missing Required Fields",
      method: "POST",
      raw: "{{baseUrl}}/api/leads",
      body: jsonBody({
        fullName: "Only Name",
      }),
      description: "Expected validation failure for missing phone/email.",
      auth: undefined,
    }),
    request({
      name: "Currency - Missing Params",
      method: "GET",
      raw: "{{baseUrl}}/api/currency/convert",
      description: "Expected 400 because amount/from/to are missing.",
      auth: { type: "noauth" },
    }),
    request({
      name: "Website Enquiries - Empty Body",
      method: "POST",
      raw: "{{baseUrl}}/api/website-enquiries/capture",
      body: jsonBody({}),
      description: "Expected validation failure because all identifiers are missing.",
      auth: { type: "noauth" },
    }),
    request({
      name: "CMS - Unauthorized List",
      method: "GET",
      raw: "{{baseUrl}}/cms/destinations",
      description: "Expected 401/403 without bearer token and CMS role.",
      auth: { type: "noauth" },
    }),
  ]);

  return { health, metrics, currency, history, leadActivities, websiteEnquiries, negative };
}

function mergeVariables(...sources) {
  const seen = new Map();
  const defaults = [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "authToken", value: "" },
    { key: "refreshToken", value: "" },
    { key: "metricsToken", value: "" },
    { key: "cmsToken", value: "" },
    { key: "cmsEmail", value: "admin@example.com" },
    { key: "cmsPassword", value: "password123" },
    { key: "userId", value: "" },
    { key: "leadId", value: "00000000-0000-0000-0000-000000000011" },
    { key: "leadActivityId", value: "" },
    { key: "quotationId", value: "00000000-0000-0000-0000-000000000012" },
    { key: "bookingId", value: "00000000-0000-0000-0000-000000000013" },
    { key: "paymentId", value: "00000000-0000-0000-0000-000000000014" },
    { key: "refundId", value: "00000000-0000-0000-0000-000000000015" },
    { key: "customerId", value: "00000000-0000-0000-0000-000000000016" },
    { key: "campaignId", value: "00000000-0000-0000-0000-000000000017" },
    { key: "crmDestinationId", value: "00000000-0000-0000-0000-000000000018" },
    { key: "crmPackageId", value: "00000000-0000-0000-0000-000000000019" },
    { key: "supplierId", value: "00000000-0000-0000-0000-000000000020" },
    { key: "countryId", value: "00000000-0000-0000-0000-000000000021" },
    { key: "createdUserId", value: "00000000-0000-0000-0000-000000000022" },
    { key: "employeeId", value: "00000000-0000-0000-0000-000000000023" },
    { key: "complaintId", value: "00000000-0000-0000-0000-000000000024" },
    { key: "visaCaseId", value: "00000000-0000-0000-0000-000000000025" },
    { key: "historyId", value: "" },
  ];

  for (const entry of defaults) {
    seen.set(entry.key, entry);
  }

  for (const source of sources) {
    for (const variable of source || []) {
      if (!seen.has(variable.key)) {
        seen.set(variable.key, variable);
      }
    }
  }

  return [...seen.values()];
}

function buildSummary(collection) {
  const requests = getAllRequests(collection.item);
  const folders = new Map();
  for (const { item, trail } of requests) {
    const key = trail[0] || "Root";
    if (!folders.has(key)) {
      folders.set(key, []);
    }
    folders.get(key).push(item);
  }

  const lines = [];
  lines.push("# Backend API Summary");
  lines.push("");
  lines.push(`Generated from backend code and route collections on ${new Date().toISOString()}.`);
  lines.push("");
  lines.push("Swagger/OpenAPI scan:");
  lines.push("- No Swagger/OpenAPI file detected in `backend/`.");
  lines.push("");
  lines.push("Auth detection:");
  lines.push("- JWT bearer auth is primary auth flow.");
  lines.push("- Logout blacklists JWT by `jti`.");
  lines.push("- No refresh-token endpoint detected in code.");
  lines.push("- No OAuth flow detected.");
  lines.push("- No API-key auth for business APIs detected.");
  lines.push("- Metrics endpoints optionally use `x-metrics-token`.");
  lines.push("");
  lines.push("Assumptions:");
  lines.push("- `History`, `Lead Activities`, `Currency`, `Website Enquiries`, `Metrics`, and `Negative Cases` request examples were inferred from validation/controllers.");
  lines.push("- Imported CRM route folders came from `Travel-CRM-Full-Routers.postman_collection.json` and were aligned with mounted backend routes.");
  lines.push("- CMS folders came from code-generated CMS collection aligned to `backend/cms/modules`.");
  lines.push("");
  lines.push(`Total requests: ${requests.length}`);
  lines.push("");

  for (const [folderName, items] of folders.entries()) {
    lines.push(`## ${folderName} (${items.length})`);
    lines.push("");
    for (const item of items) {
      const raw = item.request?.url?.raw || "";
      const authLabel = isPublicRoute(raw) ? "public" : "bearer";
      lines.push(`- \`${item.request.method} ${stripBase(raw)}\` | ${authLabel}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function buildEnvironment(collection) {
  return {
    id: "backend-full-env",
    name: "CMS / Backend Local",
    values: collection.variable.map((variable) => ({
      key: variable.key,
      value: variable.value ?? "",
      type: "default",
      enabled: true,
    })),
    _postman_variable_scope: "environment",
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: "Codex generator",
  };
}

function main() {
  const crm = loadJson("postman/Travel-CRM-Full-Routers.postman_collection.json");
  const cms = loadJson("postman/CMS.postman_collection.json");
  const website = loadJson("postman/Website-Enquiries-3-Sites.postman_collection.json");

  const manual = makeManualFolders();
  const cmsItems = (cms.item || []).filter((item) =>
    ["CMS Protected", "Public CMS"].includes(item.name),
  );
  const crmItems = (crm.item || []).filter((item) => item.name !== "Auth");
  const websiteItems = (website.item || []).filter((item) => item.name === "Website Enquiries Capture");
  const authFolder = deepClone((crm.item || []).find((item) => item.name === "Auth"));

  const collection = {
    info: {
      name: "Travel CRM - Full Backend API",
      _postman_id: "travel-crm-full-backend",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      description: "Merged full backend collection for CRM + CMS modules, aligned to mounted backend routes.",
    },
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{authToken}}", type: "string" }],
    },
    variable: mergeVariables(crm.variable, cms.variable, website.variable),
    item: [
      manual.health,
      authFolder,
      ...crmItems,
      manual.currency,
      manual.history,
      manual.leadActivities,
      manual.websiteEnquiries,
      ...websiteItems,
      manual.metrics,
      ...cmsItems,
      manual.negative,
    ],
  };

  addRuntimeEnhancements(collection);

  writeJson("postman/CMS.postman_collection.json", collection);
  writeJson("postman/CMS.postman_environment.json", buildEnvironment(collection));
  fs.writeFileSync("postman/CMS_API_SUMMARY.md", buildSummary(collection));

  console.log("Generated full backend collection, environment, and summary.");
}

main();
