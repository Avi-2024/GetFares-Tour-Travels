const fs = require("fs");
const path = require("path");

const root =
  "d:/Projects/flutter_projects/ROYAL/GetFares-Tour-Travels/get-fares";
const backendRoot = path.join(root, "backend");
const postmanDir = path.join(root, "postman");

function rel(p) {
  return p.replace(/\\/g, "/").replace(root.replace(/\\/g, "/") + "/", "");
}

function normRoutePath(p) {
  let out = p;
  out = out.replace(/\$\{[^}]+\}/g, ":id");
  out = out.replace(/:([a-zA-Z0-9_]+)\([^)]*\)/g, ":$1");
  out = out.replace(/\/+/g, "/");
  if (out.length > 1 && out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

function extractPathParams(routePath) {
  const params = [];
  const re = /:([A-Za-z0-9_]+)/g;
  let m;
  while ((m = re.exec(routePath))) params.push(m[1]);
  return Array.from(new Set(params));
}

function findFunctionRanges(code) {
  const ranges = [];
  const re = /function\s+([A-Za-z0-9_]+)\s*\(/g;
  let m;
  while ((m = re.exec(code))) {
    const name = m[1];
    const start = m.index;
    const braceStart = code.indexOf("{", m.index);
    if (braceStart === -1) continue;
    let depth = 0;
    let i = braceStart;
    for (; i < code.length; i++) {
      const ch = code[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    ranges.push({ name, start, end: i });
  }
  return ranges;
}

function functionAt(ranges, index) {
  const hit = ranges.find((r) => index >= r.start && index <= r.end);
  return hit ? hit.name : null;
}

function extractRoutesFromCode(code) {
  const ranges = findFunctionRanges(code);
  const routes = [];

  const chainRe =
    /([A-Za-z0-9_\.]+)\.route\(\s*([`'\"])([\s\S]*?)\2\s*\)([\s\S]*?);/g;
  let cm;
  while ((cm = chainRe.exec(code))) {
    const routerVar = cm[1];
    const routePath = normRoutePath(cm[3]);
    const chainBody = cm[4] || "";
    const fn = functionAt(ranges, cm.index);
    const methodRe = /\.(get|post|put|patch|delete)\s*\(([\s\S]*?)\)/g;
    let mm;
    while ((mm = methodRe.exec(chainBody))) {
      routes.push({
        routerVar,
        method: mm[1].toUpperCase(),
        routePath,
        argsSnippet: mm[2] || "",
        functionName: fn,
      });
    }
  }

  const directRe =
    /([A-Za-z0-9_\.]+)\.(get|post|put|patch|delete)\s*\(\s*([`'\"])([^`'\"]*?)\3\s*,([\s\S]*?)\);/g;
  let dm;
  while ((dm = directRe.exec(code))) {
    const routerVar = dm[1];
    const method = dm[2].toUpperCase();
    const routePath = normRoutePath(dm[4]);
    const argsSnippet = dm[5] || "";
    const fn = functionAt(ranges, dm.index);
    routes.push({
      routerVar,
      method,
      routePath,
      argsSnippet,
      functionName: fn,
    });
  }

  return routes;
}

const routeFiles = [
  path.join(backendRoot, "cms/modules/landing/landing.routes.js"),
  path.join(backendRoot, "cms/modules/destinations/destinations.routes.js"),
  path.join(backendRoot, "cms/modules/packages/packages.routes.js"),
  path.join(backendRoot, "cms/modules/visa/visa.routes.js"),
  path.join(backendRoot, "cms/modules/experience/experience.routes.js"),
  path.join(backendRoot, "cms/modules/media/media.routes.js"),
  path.join(backendRoot, "cms/modules/public/public.routes.js"),
  path.join(backendRoot, "cms/modules/landing/LandingPlaces.routes.js"),
  path.join(backendRoot, "crm/modules/auth/auth.routes.js"),
];

function mountsFor(filePath, meta) {
  const r = rel(filePath);
  if (r.endsWith("crm/modules/auth/auth.routes.js")) return ["/api/auth"];
  if (r.endsWith("cms/modules/public/public.routes.js"))
    return ["/api/public/cms", "/public/cms"];
  if (r.endsWith("cms/modules/landing/LandingPlaces.routes.js"))
    return ["/api/cms/landing-places"];
  if (r.endsWith("cms/modules/landing/landing.routes.js")) return ["/cms"];
  if (r.endsWith("cms/modules/destinations/destinations.routes.js"))
    return ["/cms/destinations"];
  if (r.endsWith("cms/modules/packages/packages.routes.js"))
    return ["/cms/packages"];
  if (r.endsWith("cms/modules/visa/visa.routes.js")) return ["/cms/visa"];
  if (r.endsWith("cms/modules/experience/experience.routes.js"))
    return ["/cms/experience"];
  if (r.endsWith("cms/modules/media/media.routes.js")) return ["/cms/media"];
  return ["/"];
}

function moduleName(ep) {
  if (ep.path.startsWith("/api/auth")) return "auth";
  if (ep.path.startsWith("/cms")) return "cms-admin";
  if (ep.path.startsWith("/api/public/cms")) return "website-api-public-cms";
  if (ep.path.startsWith("/public/cms")) return "website-public-cms";
  if (
    ep.path.startsWith("/api/cms/landing-places") ||
    ep.path === "/api/public/landing/places" ||
    ep.path === "/health"
  )
    return "legacy-cms";
  return "cms-misc";
}

function findUploadInfo(argsSnippet, code) {
  const info = [];
  const a = argsSnippet || "";
  if (/upload\.single\(/.test(a)) {
    const m = /upload\.single\(\s*['\"]([^'\"]+)['\"]\s*\)/.exec(a);
    info.push(m ? m[1] : "file");
  }
  if (/upload\.any\(/.test(a)) info.push("files[]");
  if (/paymentUploadFields/.test(a)) {
    const fieldRe = /name:\s*['\"]([^'\"]+)['\"]/g;
    let m;
    while ((m = fieldRe.exec(code))) info.push(m[1]);
  }
  return Array.from(new Set(info));
}

const endpoints = [];
for (const rf of routeFiles) {
  if (!fs.existsSync(rf)) continue;
  const code = fs.readFileSync(rf, "utf8");
  const routes = extractRoutesFromCode(code);
  for (const rt of routes) {
    const mounts = mountsFor(rf, rt);
    const uploads = findUploadInfo(rt.argsSnippet, code);
    for (const m of mounts) {
      const fullPath = normRoutePath(
        (m + "/" + rt.routePath).replace(/\/+/g, "/"),
      );
      let auth = "none";
      if (fullPath.startsWith("/cms/")) auth = "bearer";
      if (
        fullPath.startsWith("/api/auth/me") ||
        fullPath.startsWith("/api/auth/logout") ||
        fullPath.startsWith("/api/auth/toggle-active")
      )
        auth = "bearer";

      endpoints.push({
        method: rt.method,
        path: fullPath,
        sourceFile: rel(rf),
        module: moduleName({ path: fullPath }),
        auth,
        uploads,
        pathParams: extractPathParams(fullPath),
      });
    }
  }
}

// Explicit legacy CMS app endpoints from CmsApplication.js
endpoints.push(
  {
    method: "GET",
    path: "/health",
    sourceFile: "backend/cms/CmsApplication.js",
    module: "legacy-cms",
    auth: "none",
    uploads: [],
    pathParams: [],
  },
  {
    method: "GET",
    path: "/api/public/landing/places",
    sourceFile: "backend/cms/CmsApplication.js",
    module: "legacy-cms",
    auth: "none",
    uploads: [],
    pathParams: [],
  },
);

// Dedup
const map = new Map();
for (const ep of endpoints) {
  const key = `${ep.method} ${ep.path} ${ep.sourceFile}`;
  if (!map.has(key)) map.set(key, ep);
}
const finalEndpoints = Array.from(map.values()).sort((a, b) => {
  if (a.module !== b.module) return a.module.localeCompare(b.module);
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return a.method.localeCompare(b.method);
});

function replacePathParams(p) {
  return p.replace(/:([A-Za-z0-9_]+)/g, (_, p1) => `{{${p1}}}`);
}

function titleCase(s) {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function exampleBodyForPath(ep) {
  if (ep.path === "/api/auth/login")
    return { email: "user@example.com", password: "P@ssw0rd123" };
  if (ep.path === "/api/auth/register")
    return {
      fullName: "CMS Admin",
      email: "admin@example.com",
      password: "P@ssw0rd123",
      phone: "+919999999999",
    };
  if (ep.path.includes("/status")) return { isActive: true, status: "ACTIVE" };
  if (ep.path.includes("/reorder"))
    return { items: [{ id: "{{id}}", displayOrder: 1 }] };
  if (ep.path.includes("/hero-sections"))
    return {
      title: "Explore",
      subtitle: "Discover places",
      imageUrl: "https://example.com/hero.jpg",
    };
  if (ep.path.includes("/season-cards"))
    return { title: "Summer Escape", description: "Best season package" };
  if (
    ep.path.includes("/featured-picks") ||
    ep.path.includes("/creative-toolkit")
  )
    return { title: "Top Pick", description: "Curated campaign block" };
  return {
    name: "Sample Name",
    description: "Sample description",
    slug: "sample-slug",
    isActive: true,
  };
}

function expectedCodes(ep) {
  const isPublic = ep.auth === "none";
  if (ep.method === "POST")
    return isPublic ? [200, 201, 400] : [200, 201, 400, 401, 403];
  if (ep.method === "PATCH" || ep.method === "PUT")
    return isPublic ? [200, 400, 404] : [200, 400, 401, 403, 404];
  if (ep.method === "DELETE")
    return isPublic ? [200, 404] : [200, 401, 403, 404];
  return isPublic ? [200, 400, 404] : [200, 400, 401, 403, 404];
}

function buildRequest(ep) {
  const headers = [{ key: "Accept", value: "application/json" }];
  const query = [];
  const isWrite = ["POST", "PUT", "PATCH"].includes(ep.method);
  let body;

  if (ep.auth === "none") {
    // noauth for public routes
  }

  if (isWrite) {
    if (ep.uploads && ep.uploads.length) {
      body = {
        mode: "formdata",
        formdata: [
          ...ep.uploads.map((u) => ({ key: u, type: "file", src: "" })),
          { key: "name", type: "text", value: "Sample Name" },
          { key: "description", type: "text", value: "Sample description" },
        ],
      };
    } else {
      headers.push({ key: "Content-Type", value: "application/json" });
      body = {
        mode: "raw",
        raw: JSON.stringify(exampleBodyForPath(ep), null, 2),
        options: { raw: { language: "json" } },
      };
    }
  }

  const rawUrl = `{{baseUrl}}${replacePathParams(ep.path)}`;
  const codes = expectedCodes(ep);
  const tests = [
    `pm.test('Status code is expected', function () { pm.expect([${codes.join(", ")}]).to.include(pm.response.code); });`,
    "pm.test('Response time under 5s', function () { pm.expect(pm.response.responseTime).to.be.below(5000); });",
  ];

  if (ep.path === "/api/auth/login" && ep.method === "POST") {
    tests.push(`pm.test('Save CMS tokens and user', function () {
  const json = pm.response.json();
  const token = json?.data?.token || json?.token;
  const refresh = json?.data?.refreshToken || json?.refreshToken;
  const userId = json?.data?.user?.id || json?.user?.id || json?.data?.id;
  if (token) {
    pm.environment.set('cmsToken', token);
    pm.environment.set('authToken', token);
  }
  if (refresh) pm.environment.set('refreshToken', refresh);
  if (userId) pm.environment.set('userId', userId);
});`);
  }

  if (
    ep.method === "POST" &&
    !ep.path.includes("/login") &&
    !ep.path.includes("/logout")
  ) {
    tests.push(`pm.test('Save created id when present', function () {
  let json;
  try { json = pm.response.json(); } catch (e) { return; }
  const id = json?.data?.id || json?.id || json?.data?.[0]?.id;
  if (id) pm.environment.set('id', id);
});`);
  }

  const req = {
    name: `${ep.method} ${ep.path.replace(/^\//, "").replace(/\//g, " ")}`,
    request: {
      method: ep.method,
      header: headers,
      url: { raw: rawUrl, query },
      description: [
        `Source: ${ep.sourceFile}`,
        `Auth: ${ep.auth}`,
        "Assumption: request/response examples are inferred from CMS route structure and naming.",
      ].join("\n"),
    },
    event: [
      {
        listen: "prerequest",
        script: {
          type: "text/javascript",
          exec: [
            "pm.variables.set('requestId', pm.variables.replaceIn('{{$guid}}'));",
            "pm.variables.set('requestTimestamp', new Date().toISOString());",
          ],
        },
      },
      {
        listen: "test",
        script: { type: "text/javascript", exec: tests },
      },
    ],
    response: [
      {
        name: "Success Example",
        originalRequest: {
          method: ep.method,
          header: headers,
          url: { raw: rawUrl },
        },
        status: "OK",
        code: codes[0],
        _postman_previewlanguage: "json",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: JSON.stringify(
          { success: true, data: { id: "{{id}}" }, meta: { assumed: true } },
          null,
          2,
        ),
      },
      {
        name: "Validation Error Example",
        originalRequest: {
          method: ep.method,
          header: headers,
          url: { raw: rawUrl },
        },
        status: "Bad Request",
        code: 400,
        _postman_previewlanguage: "json",
        header: [{ key: "Content-Type", value: "application/json" }],
        body: JSON.stringify(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Validation failed" },
          },
          null,
          2,
        ),
      },
    ],
  };

  if (body) req.request.body = body;
  if (ep.auth === "none") req.request.auth = { type: "noauth" };
  return req;
}

const byModule = new Map();
for (const ep of finalEndpoints) {
  if (!byModule.has(ep.module)) byModule.set(ep.module, []);
  byModule.get(ep.module).push(ep);
}

const items = [];
for (const [mod, eps] of Array.from(byModule.entries()).sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  const reqs = eps.map(buildRequest);

  const protectedEp = eps.find((e) => e.auth === "bearer");
  const mutable = eps.find((e) =>
    ["POST", "PUT", "PATCH", "DELETE"].includes(e.method),
  );
  const negatives = [];

  if (protectedEp) {
    negatives.push({
      name: "Unauthorized - Missing Token",
      request: {
        method: protectedEp.method,
        auth: { type: "noauth" },
        header: [{ key: "Accept", value: "application/json" }],
        url: {
          raw: `{{baseUrl}}${replacePathParams(protectedEp.path)}`,
          query: [],
        },
        description:
          "Expected 401/403 for protected route without bearer token.",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "pm.test('Unauthorized expected', function () { pm.expect([401, 403]).to.include(pm.response.code); });",
            ],
          },
        },
      ],
    });
  }

  if (mutable && ["POST", "PUT", "PATCH"].includes(mutable.method)) {
    negatives.push({
      name: "Validation Failure - Empty Body",
      request: {
        method: mutable.method,
        header: [
          { key: "Accept", value: "application/json" },
          { key: "Content-Type", value: "application/json" },
        ],
        url: {
          raw: `{{baseUrl}}${replacePathParams(mutable.path)}`,
          query: [],
        },
        body: {
          mode: "raw",
          raw: "{}",
          options: { raw: { language: "json" } },
        },
        description: "Expected validation failure for missing required fields.",
      },
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: [
              "pm.test('Validation error expected', function () { pm.expect([400, 422]).to.include(pm.response.code); });",
            ],
          },
        },
      ],
    });
  }

  items.push({
    name: titleCase(mod),
    description: `CMS-only module: ${mod}`,
    item:
      negatives.length ?
        [...reqs, { name: "Negative Cases", item: negatives }]
      : reqs,
  });
}

const collection = {
  info: {
    name: "GetFares CMS API - Auto Generated",
    _postman_id: "f4f2f80a-1d08-4cdf-8f22-333333333333",
    description: [
      "CMS-only Postman collection generated from backend CMS route files.",
      "Includes CMS admin routes, public website CMS routes, legacy CMS app routes, and auth routes needed for CMS token flow.",
      "Assumptions are documented per request and in the summary markdown.",
    ].join("\n"),
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{cmsToken}}", type: "string" }],
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "cmsToken", value: "" },
    { key: "authToken", value: "" },
    { key: "refreshToken", value: "" },
    { key: "userId", value: "" },
    { key: "id", value: "" },
    { key: "slug", value: "sample-slug" },
    { key: "sectionKey", value: "home" },
    { key: "mediaId", value: "" },
    { key: "seasonId", value: "" },
    { key: "mainPackageId", value: "" },
    { key: "requestId", value: "" },
    { key: "requestTimestamp", value: "" },
  ],
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "pm.variables.set('requestId', pm.variables.replaceIn('{{$guid}}'));",
          "pm.variables.set('requestTimestamp', new Date().toISOString());",
        ],
      },
    },
  ],
  item: items,
};

const environment = {
  id: "53d79422-5b09-4db7-8f8d-444444444444",
  name: "GetFares CMS Local",
  values: [
    { key: "baseUrl", value: "http://localhost:3000", enabled: true },
    { key: "cmsToken", value: "", enabled: true },
    { key: "authToken", value: "", enabled: true },
    { key: "refreshToken", value: "", enabled: true },
    { key: "userId", value: "", enabled: true },
    { key: "id", value: "", enabled: true },
    { key: "slug", value: "sample-slug", enabled: true },
    { key: "sectionKey", value: "home", enabled: true },
    { key: "mediaId", value: "", enabled: true },
    { key: "seasonId", value: "", enabled: true },
    { key: "mainPackageId", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "GitHub Copilot GPT-5.3-Codex",
};

const summary = [];
summary.push("# CMS API Summary");
summary.push("");
summary.push(`Generated at: ${new Date().toISOString()}`);
summary.push("");
summary.push("## Scope");
summary.push("");
summary.push(
  "- Included: CMS admin routes (/cms/*), website public CMS routes (/api/public/cms/* and /public/cms/*), legacy CMS app routes (/api/cms/landing-places*, /api/public/landing/places, /health), and auth routes for CMS token flow (/api/auth/*).",
);
summary.push(
  "- Excluded: all non-CMS CRM business modules (leads, bookings, payments, suppliers, etc.).",
);
summary.push("");
summary.push("## Modules");
summary.push("");
for (const [m, eps] of Array.from(byModule.entries()).sort((a, b) =>
  a[0].localeCompare(b[0]),
)) {
  summary.push(`- ${m}: ${eps.length} endpoints`);
}
summary.push("");
summary.push("## Endpoints");
summary.push("");
for (const ep of finalEndpoints) {
  const params =
    ep.pathParams.length ? ` params=[${ep.pathParams.join(", ")}]` : "";
  const up =
    ep.uploads && ep.uploads.length ?
      ` uploads=[${ep.uploads.join(", ")}]`
    : "";
  summary.push(
    `- ${ep.method} ${ep.path} | module=${ep.module} | auth=${ep.auth}${params}${up} | source=${ep.sourceFile}`,
  );
}
summary.push("");
summary.push("## Assumptions");
summary.push("");
summary.push(
  "- Request body/query examples are inferred where explicit validation schemas are not exposed in route files.",
);
summary.push(
  "- Response examples are representative envelopes and may differ from runtime controller payload shape.",
);
summary.push(
  "- If a route is implemented but guarded dynamically in middleware, auth is inferred from mount and route conventions.",
);

fs.writeFileSync(
  path.join(postmanDir, "CMS2.postman_collection.json"),
  JSON.stringify(collection, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(
  path.join(postmanDir, "CMS2.postman_environment.json"),
  JSON.stringify(environment, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(
  path.join(postmanDir, "CMS2_API_SUMMARY.md"),
  summary.join("\n") + "\n",
  "utf8",
);

console.log(
  "Generated CMS2.postman_collection.json, CMS2.postman_environment.json, CMS2_API_SUMMARY.md",
);
console.log(`Total CMS endpoints: ${finalEndpoints.length}`);
