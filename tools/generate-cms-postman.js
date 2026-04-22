const fs = require("fs");
const { randomUUID } = require("crypto");

const baseHeaders = [{ key: "Accept", value: "application/json" }];

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function makeUrl(raw, query = []) {
  return {
    raw,
    query: query.map((q) => ({ key: q.key, value: String(q.value) })),
  };
}

function jsonBody(obj) {
  return {
    mode: "raw",
    raw: JSON.stringify(obj, null, 2),
    options: { raw: { language: "json" } },
  };
}

function formBody(items) {
  return {
    mode: "formdata",
    formdata: items.map((item) => ({ ...item })),
  };
}

function idCaptureScript(varName, extra = []) {
  const lines = [
    "try {",
    "  const payload = pm.response.json();",
    "  const data = payload?.data || {};",
    `  if (data?.id) pm.collectionVariables.set('${varName}', data.id);`,
  ];
  for (const ex of extra) {
    lines.push(
      `  if (data?.${ex.from}) pm.collectionVariables.set('${ex.to}', String(data.${ex.from}));`,
    );
  }
  lines.push("} catch (e) {}");
  return [
    {
      listen: "test",
      script: { type: "text/javascript", exec: lines },
    },
  ];
}

function req({
  name,
  method,
  raw,
  query = [],
  body = null,
  auth = null,
  events = [],
  description = "",
}) {
  const request = {
    method,
    header: clone(baseHeaders),
    url: makeUrl(raw, query),
  };

  if (description) {
    request.description = description;
  }

  if (body) {
    request.body = body;
    if (body.mode === "raw") {
      request.header.push({ key: "Content-Type", value: "application/json" });
    }
  }

  if (auth) {
    request.auth = auth;
  }

  return {
    name,
    request,
    ...(events.length ? { event: events } : {}),
    response: [],
  };
}

function folder(name, items, extra = {}) {
  return { name, item: items, ...extra };
}

const loginEvent = [
  {
    listen: "test",
    script: {
      type: "text/javascript",
      exec: [
        "try {",
        "  const payload = pm.response.json();",
        "  const token = payload?.data?.accessToken || payload?.accessToken || payload?.token;",
        "  if (token) pm.collectionVariables.set('cmsToken', token);",
        "} catch (e) {}",
      ],
    },
  },
];

const collection = {
  info: {
    _postman_id: randomUUID(),
    name: "CMS",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    description: "Auto-synced with backend/cms modules routes and controller payloads.",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:3000" },
    { key: "cmsToken", value: "" },
    { key: "cmsEmail", value: "admin@example.com" },
    { key: "cmsPassword", value: "password123" },
    { key: "country", value: "UAE" },
    { key: "region", value: "Middle East" },
    { key: "category", value: "Leisure" },
    { key: "slug", value: "dubai" },
    { key: "sectionKey", value: "home-hero" },
    { key: "landingId", value: "00000000-0000-0000-0000-000000000001" },
    { key: "destinationId", value: "00000000-0000-0000-0000-000000000002" },
    { key: "mediaId", value: "00000000-0000-0000-0000-000000000003" },
    { key: "seasonId", value: "00000000-0000-0000-0000-000000000004" },
    { key: "packageId", value: "00000000-0000-0000-0000-000000000005" },
    { key: "mainPackageId", value: "00000000-0000-0000-0000-000000000006" },
    { key: "subPackageId", value: "00000000-0000-0000-0000-000000000007" },
    { key: "visaId", value: "00000000-0000-0000-0000-000000000008" },
    { key: "featuredPickId", value: "00000000-0000-0000-0000-000000000009" },
    { key: "seasonCardId", value: "00000000-0000-0000-0000-000000000010" },
    { key: "entityType", value: "destination" },
    { key: "entityId", value: "{{destinationId}}" },
    { key: "sampleImagePath", value: "" },
    { key: "sampleImageUrl", value: "https://picsum.photos/1200/800" },
    {
      key: "sampleVideoUrl",
      value: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    },
  ],
  item: [],
};

const authFolder = folder("Auth", [
  req({
    name: "Login (Get CMS Token)",
    method: "POST",
    raw: "{{baseUrl}}/api/auth/login",
    body: jsonBody({ email: "{{cmsEmail}}", password: "{{cmsPassword}}" }),
    auth: { type: "noauth" },
    events: loginEvent,
  }),
  req({ name: "Get Current User", method: "GET", raw: "{{baseUrl}}/api/auth/me" }),
]);

const healthFolder = folder("Health", [
  req({ name: "Health", method: "GET", raw: "{{baseUrl}}/health" }),
  req({ name: "Health Live", method: "GET", raw: "{{baseUrl}}/health/live" }),
  req({ name: "Health Ready", method: "GET", raw: "{{baseUrl}}/health/ready" }),
]);

const landingFolder = folder("Landing", [
  req({
    name: "List",
    method: "GET",
    raw: "{{baseUrl}}/cms?active=true&country={{country}}&includeDeleted=false",
    query: [
      { key: "active", value: "true" },
      { key: "country", value: "{{country}}" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted",
    method: "GET",
    raw: "{{baseUrl}}/cms/deleted?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
  }),
  req({ name: "Get By ID", method: "GET", raw: "{{baseUrl}}/cms/{{landingId}}" }),
  req({
    name: "Create",
    method: "POST",
    raw: "{{baseUrl}}/cms?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "title", value: "Dubai", type: "text" },
      { key: "tag", value: "Luxury City Escapes", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "country", value: "{{country}}", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("landingId"),
  }),
  req({
    name: "Update",
    method: "PUT",
    raw: "{{baseUrl}}/cms/{{landingId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "title", value: "Dubai Updated", type: "text" },
      { key: "tag", value: "Premium City Escapes", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({ name: "Delete (Soft)", method: "DELETE", raw: "{{baseUrl}}/cms/{{landingId}}" }),
  req({
    name: "Update Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/{{landingId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({ name: "Restore", method: "PATCH", raw: "{{baseUrl}}/cms/{{landingId}}/restore" }),
  req({
    name: "Hard Delete",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/{{landingId}}/hard-delete",
  }),
  req({
    name: "Reorder",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/reorder",
    body: jsonBody({ items: [{ id: "{{landingId}}", displayOrder: 1 }] }),
  }),
]);

const destinationsFolder = folder("Destinations", [
  req({
    name: "List",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/destinations?country={{country}}&region={{region}}&category={{category}}&isActive=true&isPopular=false&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "region", value: "{{region}}" },
      { key: "category", value: "{{category}}" },
      { key: "isActive", value: "true" },
      { key: "isPopular", value: "false" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted",
    method: "GET",
    raw: "{{baseUrl}}/cms/destinations/deleted?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
  }),
  req({
    name: "Get By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}",
  }),
  req({
    name: "Get By Slug",
    method: "GET",
    raw: "{{baseUrl}}/cms/destinations/slug/{{slug}}",
  }),
  req({
    name: "Create",
    method: "POST",
    raw: "{{baseUrl}}/cms/destinations?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "name", value: "Dubai", type: "text" },
      { key: "slug", value: "dubai", type: "text" },
      { key: "description", value: "City destination", type: "text" },
      { key: "shortDescription", value: "Short copy", type: "text" },
      { key: "country", value: "{{country}}", type: "text" },
      { key: "region", value: "{{region}}", type: "text" },
      { key: "categories", value: "[\"Leisure\",\"Family\"]", type: "text" },
      { key: "seasonFocus", value: "[\"Winter\"]", type: "text" },
      { key: "rating", value: "4.5", type: "text" },
      { key: "travelType", value: "International", type: "text" },
      { key: "keyHighlights", value: "[\"Beaches\",\"Shopping\"]", type: "text" },
      {
        key: "services",
        value: "[{\"title\":\"Hotel\",\"description\":\"4-star stay\"}]",
        type: "text",
      },
      {
        key: "bestTimeToVisit",
        value: "[{\"title\":\"Winter\",\"from\":\"Nov\",\"to\":\"Mar\"}]",
        type: "text",
      },
      { key: "heroImageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "thumbnailUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "titleImageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "isPopular", value: "true", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "metaTitle", value: "Dubai Packages", type: "text" },
      { key: "metaDescription", value: "SEO description", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
      { key: "gallery", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("destinationId", [{ from: "slug", to: "slug" }]),
  }),
  req({
    name: "Update",
    method: "PUT",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "name", value: "Dubai Updated", type: "text" },
      { key: "description", value: "Updated description", type: "text" },
      { key: "categories", value: "[\"Leisure\"]", type: "text" },
      { key: "isPopular", value: "false", type: "text" },
      { key: "metaTitle", value: "Updated SEO", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
      { key: "galleryImages", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}",
  }),
  req({
    name: "Update Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({
    name: "Restore",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/restore",
  }),
  req({
    name: "Hard Delete",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/hard-delete",
  }),
  req({
    name: "Get Media",
    method: "GET",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/media",
  }),
  req({
    name: "Add Media",
    method: "POST",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/media",
    body: formBody([
      { key: "mediaType", value: "image", type: "text" },
      { key: "mediaUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "thumbnailUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "title", value: "Gallery image", type: "text" },
      { key: "caption", value: "Caption copy", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isFeatured", value: "false", type: "text" },
      { key: "media", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("mediaId"),
  }),
  req({
    name: "Update Media",
    method: "PUT",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/media/{{mediaId}}",
    body: formBody([
      { key: "title", value: "Gallery image updated", type: "text" },
      { key: "caption", value: "Updated caption", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "media", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete Media (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/media/{{mediaId}}",
  }),
  req({
    name: "Hard Delete Media",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/media/{{mediaId}}/hard-delete",
  }),
  req({
    name: "Get Seasons",
    method: "GET",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/seasons",
  }),
  req({
    name: "Add Season",
    method: "POST",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/seasons",
    body: jsonBody({
      title: "Winter Escape",
      fromMonth: "Nov",
      toMonth: "Mar",
      description: "Best weather window",
      tag: "Peak",
      iconName: "snowflake",
      iconColor: "#ffffff",
      bgColor: "#1f2937",
      displayOrder: 1,
      isActive: true,
    }),
    events: idCaptureScript("seasonId"),
  }),
  req({
    name: "Update Season",
    method: "PUT",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/seasons/{{seasonId}}",
    body: jsonBody({
      title: "Winter Escape Updated",
      fromMonth: "Oct",
      toMonth: "Mar",
      description: "Updated season",
      displayOrder: 2,
      isActive: true,
    }),
  }),
  req({
    name: "Delete Season (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/seasons/{{seasonId}}",
  }),
  req({
    name: "Hard Delete Season",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/destinations/{{destinationId}}/seasons/{{seasonId}}/hard-delete",
  }),
]);

const packagesFolder = folder("Packages", [
  req({
    name: "List Published",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/published?country={{country}}&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted Published",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/published/deleted?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
  }),
  req({
    name: "Create Published",
    method: "POST",
    raw: "{{baseUrl}}/cms/packages/published",
    body: formBody([
      { key: "name", value: "Dubai Summer Deal", type: "text" },
      { key: "destinationId", value: "{{destinationId}}", type: "text" },
      { key: "duration", value: "4N/5D", type: "text" },
      { key: "startingPrice", value: "12999", type: "text" },
      { key: "inclusions", value: "Flights, Hotel", type: "text" },
      { key: "exclusions", value: "Visa", type: "text" },
      { key: "itinerary", value: "[{\"day\":1,\"title\":\"Arrival\"}]", type: "text" },
      { key: "hotelDetails", value: "4 star", type: "text" },
      { key: "validFrom", value: "2026-04-01", type: "text" },
      { key: "validTo", value: "2026-12-31", type: "text" },
      { key: "cancellationPolicy", value: "48 hours", type: "text" },
      { key: "packageCategory", value: "Leisure", type: "text" },
      { key: "status", value: "DRAFT", type: "text" },
      { key: "bannerImageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "galleryImageUrls", value: "[\"{{sampleImageUrl}}\"]", type: "text" },
      { key: "publishToWebsite", value: "true", type: "text" },
      { key: "websiteSlug", value: "dubai-summer-deal", type: "text" },
      { key: "metaTitle", value: "Dubai Summer Deal", type: "text" },
      { key: "metaDescription", value: "Package SEO", type: "text" },
      { key: "keywords", value: "dubai,summer", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
      { key: "gallery", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("packageId"),
  }),
  req({
    name: "Get Published By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/published/{{packageId}}",
  }),
  req({
    name: "Update Published",
    method: "PUT",
    raw: "{{baseUrl}}/cms/packages/published/{{packageId}}",
    body: formBody([
      { key: "name", value: "Dubai Summer Deal Updated", type: "text" },
      { key: "startingPrice", value: "14999", type: "text" },
      { key: "publishToWebsite", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete Published (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/published/{{packageId}}",
  }),
  req({
    name: "Restore Published",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/packages/published/{{packageId}}/restore",
  }),
  req({
    name: "Hard Delete Published",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/published/{{packageId}}/hard-delete",
  }),

  req({
    name: "List Main",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/main?country={{country}}&isFeatured=true&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "isFeatured", value: "true" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted Main",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/main/deleted?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
  }),
  req({
    name: "Create Main",
    method: "POST",
    raw: "{{baseUrl}}/cms/packages/main?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: jsonBody({
      destinationId: "{{destinationId}}",
      country: "{{country}}",
      title: "Dubai Main Package",
      amount: 19999,
      features: [{ iconName: "hotel", description: "4 star" }],
      inclusions: [{ iconName: "flight", description: "Round trip" }],
      metaTitle: "Main Package SEO",
      metaDescription: "Main package description",
      keywords: "dubai,package",
      displayOrder: 1,
      isFeatured: true,
    }),
    events: idCaptureScript("mainPackageId"),
  }),
  req({
    name: "Get Main By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}",
  }),
  req({
    name: "Update Main",
    method: "PUT",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: jsonBody({
      title: "Dubai Main Package Updated",
      amount: 21999,
      displayOrder: 2,
      isFeatured: true,
    }),
  }),
  req({
    name: "Delete Main (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}",
  }),
  req({
    name: "Restore Main",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}/restore",
  }),
  req({
    name: "Hard Delete Main",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}/hard-delete",
  }),

  req({
    name: "List Sub By Main",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/main/{{mainPackageId}}/sub?country={{country}}&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted Sub",
    method: "GET",
    raw: "{{baseUrl}}/cms/packages/sub/deleted",
  }),
  req({
    name: "Create Sub",
    method: "POST",
    raw: "{{baseUrl}}/cms/packages/sub",
    body: formBody([
      { key: "mainPackageId", value: "{{mainPackageId}}", type: "text" },
      { key: "title", value: "3N Dubai Explorer", type: "text" },
      { key: "location", value: "Dubai", type: "text" },
      { key: "rating", value: "4.2", type: "text" },
      { key: "duration", value: "3N/4D", type: "text" },
      { key: "durationDays", value: "4", type: "text" },
      { key: "durationNights", value: "3", type: "text" },
      { key: "startingPrice", value: "15999", type: "text" },
      { key: "transport", value: "Private", type: "text" },
      { key: "description", value: "Sub package details", type: "text" },
      { key: "snapshot", value: "Quick summary", type: "text" },
      { key: "features", value: "[\"Breakfast\",\"Transfers\"]", type: "text" },
      {
        key: "itineraries",
        value:
          "[{\"title\":\"Day 1\",\"description\":\"Arrival\",\"features\":[\"Check-in\"]}]",
        type: "text",
      },
      { key: "highlights", value: "[\"Burj Khalifa\"]", type: "text" },
      { key: "inclusions", value: "[\"Hotel\",\"Transfers\"]", type: "text" },
      { key: "exclusions", value: "[\"Lunch\"]", type: "text" },
      { key: "paymentTerms", value: "[\"50% advance\"]", type: "text" },
      { key: "cancellationPolicy", value: "[\"Non-refundable\"]", type: "text" },
      { key: "tnc", value: "[\"Terms apply\"]", type: "text" },
      { key: "impNotes", value: "[\"Carry passport\"]", type: "text" },
      { key: "metaTitle", value: "Sub Package SEO", type: "text" },
      { key: "metaDescription", value: "Sub package seo desc", type: "text" },
      { key: "keywords", value: "dubai,sub", type: "text" },
      { key: "status", value: "DRAFT", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "image", value: "{{sampleImageUrl}}", type: "text" },
      { key: "file", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("subPackageId"),
  }),
  req({
    name: "Update Sub",
    method: "PUT",
    raw: "{{baseUrl}}/cms/packages/sub/{{subPackageId}}",
    body: formBody([
      { key: "title", value: "3N Dubai Explorer Updated", type: "text" },
      { key: "startingPrice", value: "16999", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "image", value: "{{sampleImageUrl}}", type: "text" },
      { key: "file", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete Sub (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/sub/{{subPackageId}}",
  }),
  req({
    name: "Restore Sub",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/packages/sub/{{subPackageId}}/restore",
  }),
  req({
    name: "Hard Delete Sub",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/packages/sub/{{subPackageId}}/hard-delete",
  }),
]);

const visaFolder = folder("Visa", [
  req({
    name: "List",
    method: "GET",
    raw: "{{baseUrl}}/cms/visa?country={{country}}&isActive=true&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "isActive", value: "true" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted",
    method: "GET",
    raw: "{{baseUrl}}/cms/visa/deleted?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
  }),
  req({ name: "Get By ID", method: "GET", raw: "{{baseUrl}}/cms/visa/{{visaId}}" }),
  req({ name: "Get By Slug", method: "GET", raw: "{{baseUrl}}/cms/visa/slug/{{slug}}" }),
  req({
    name: "Create",
    method: "POST",
    raw: "{{baseUrl}}/cms/visa?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "name", value: "UAE Tourist Visa", type: "text" },
      { key: "title", value: "UAE Visa", type: "text" },
      { key: "slug", value: "uae-visa", type: "text" },
      { key: "country", value: "{{country}}", type: "text" },
      { key: "subDescription", value: "Fast processing", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "overviewTitle", value: "Overview", type: "text" },
      { key: "overviewDescription", value: "Visa overview details", type: "text" },
      { key: "quickSupportTitle", value: "Support", type: "text" },
      { key: "quickSupportDescription", value: "24x7", type: "text" },
      { key: "supportIncluded", value: "[\"Document check\",\"Call support\"]", type: "text" },
      { key: "priceCurrency", value: "AED", type: "text" },
      { key: "priceAmount", value: "399", type: "text" },
      { key: "highlights", value: "[\"Express\",\"Trusted\"]", type: "text" },
      { key: "visaDetails", value: "[\"30 days stay\"]", type: "text" },
      { key: "requirements", value: "[\"Passport\",\"Photo\"]", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "metaTitle", value: "UAE Visa", type: "text" },
      { key: "metaDescription", value: "Visa seo desc", type: "text" },
      { key: "keywords", value: "uae,visa", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("visaId", [{ from: "slug", to: "slug" }]),
  }),
  req({
    name: "Update",
    method: "PUT",
    raw: "{{baseUrl}}/cms/visa/{{visaId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "title", value: "UAE Visa Updated", type: "text" },
      { key: "subDescription", value: "Updated copy", type: "text" },
      { key: "priceAmount", value: "450", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({ name: "Delete (Soft)", method: "DELETE", raw: "{{baseUrl}}/cms/visa/{{visaId}}" }),
  req({
    name: "Update Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/visa/{{visaId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({ name: "Restore", method: "PATCH", raw: "{{baseUrl}}/cms/visa/{{visaId}}/restore" }),
  req({
    name: "Hard Delete",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/visa/{{visaId}}/hard-delete",
  }),
]);

const experienceFolder = folder("Experience", [
  req({
    name: "List Featured Picks",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/featured-picks?country={{country}}&isActive=true&sectionKey=featured-hot-picks&campaignType=featured&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "isActive", value: "true" },
      { key: "sectionKey", value: "featured-hot-picks" },
      { key: "campaignType", value: "featured" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Creative Toolkit",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/creative-toolkit?country={{country}}&isActive=true&sectionKey=creative-toolkit&campaignType=creative&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "isActive", value: "true" },
      { key: "sectionKey", value: "creative-toolkit" },
      { key: "campaignType", value: "creative" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted Featured Picks",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/featured-picks/deleted?country={{country}}&sectionKey=featured-hot-picks&campaignType=featured",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "sectionKey", value: "featured-hot-picks" },
      { key: "campaignType", value: "featured" },
    ],
  }),
  req({
    name: "List Deleted Creative Toolkit",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/creative-toolkit/deleted?country={{country}}&sectionKey=creative-toolkit&campaignType=creative",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "sectionKey", value: "creative-toolkit" },
      { key: "campaignType", value: "creative" },
    ],
  }),
  req({
    name: "Create Featured Pick",
    method: "POST",
    raw: "{{baseUrl}}/cms/experience/featured-picks?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "slug", value: "dubai-featured-pick", type: "text" },
      { key: "title", value: "Dubai Highlights", type: "text" },
      { key: "subtitle", value: "Top attractions", type: "text" },
      { key: "category", value: "destination", type: "text" },
      { key: "campaignType", value: "featured", type: "text" },
      { key: "sectionKey", value: "featured-hot-picks", type: "text" },
      { key: "referenceId", value: "{{destinationId}}", type: "text" },
      { key: "country", value: "{{country}}", type: "text" },
      { key: "rating", value: "4.6", type: "text" },
      { key: "badgeText", value: "Top Pick", type: "text" },
      { key: "originalPrice", value: "2499", type: "text" },
      { key: "discountedPrice", value: "1999", type: "text" },
      { key: "duration", value: "3D", type: "text" },
      { key: "description", value: "Best for family", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "buttonText", value: "Book Now", type: "text" },
      { key: "ctaUrl", value: "/destination/dubai", type: "text" },
      { key: "expiresOn", value: "2026-12-31", type: "text" },
      { key: "tags", value: "[\"family\",\"popular\"]", type: "text" },
      { key: "highlights", value: "[\"Fast\",\"Curated\"]", type: "text" },
      { key: "metadata", value: "{\"source\":\"cms\"}", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("featuredPickId", [{ from: "slug", to: "slug" }]),
  }),
  req({
    name: "Create Creative Toolkit",
    method: "POST",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "slug", value: "dubai-creative-toolkit", type: "text" },
      { key: "title", value: "Dubai Creative", type: "text" },
      { key: "campaignType", value: "creative", type: "text" },
      { key: "sectionKey", value: "creative-toolkit", type: "text" },
      { key: "country", value: "{{country}}", type: "text" },
      { key: "description", value: "Toolkit card", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("featuredPickId", [{ from: "slug", to: "slug" }]),
  }),
  req({
    name: "Get Featured Pick By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}",
  }),
  req({
    name: "Get Creative Toolkit By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}",
  }),
  req({
    name: "Update Featured Pick",
    method: "PUT",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "title", value: "Dubai Highlights Updated", type: "text" },
      { key: "discountedPrice", value: "1799", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Update Creative Toolkit",
    method: "PUT",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "title", value: "Creative Toolkit Updated", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete Featured Pick (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}",
  }),
  req({
    name: "Delete Creative Toolkit (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}",
  }),
  req({
    name: "Update Featured Pick Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({
    name: "Update Creative Toolkit Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({
    name: "Restore Featured Pick",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}/restore",
  }),
  req({
    name: "Restore Creative Toolkit",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}/restore",
  }),
  req({
    name: "Hard Delete Featured Pick",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/featured-picks/{{featuredPickId}}/hard-delete",
  }),
  req({
    name: "Hard Delete Creative Toolkit",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/creative-toolkit/{{featuredPickId}}/hard-delete",
  }),

  req({
    name: "List Season Cards",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/season-cards?country={{country}}&destinationId={{destinationId}}&isActive=true&includeDeleted=false",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "destinationId", value: "{{destinationId}}" },
      { key: "isActive", value: "true" },
      { key: "includeDeleted", value: "false" },
    ],
  }),
  req({
    name: "List Deleted Season Cards",
    method: "GET",
    raw:
      "{{baseUrl}}/cms/experience/season-cards/deleted?country={{country}}&destinationId={{destinationId}}",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "destinationId", value: "{{destinationId}}" },
    ],
  }),
  req({
    name: "Create Season Card",
    method: "POST",
    raw: "{{baseUrl}}/cms/experience/season-cards",
    body: formBody([
      { key: "destinationId", value: "{{destinationId}}", type: "text" },
      { key: "title", value: "Best Time To Visit", type: "text" },
      { key: "fromMonth", value: "Nov", type: "text" },
      { key: "toMonth", value: "Mar", type: "text" },
      { key: "description", value: "Cool weather", type: "text" },
      { key: "tag", value: "Peak", type: "text" },
      { key: "imageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "iconName", value: "sun", type: "text" },
      { key: "iconColor", value: "#ffffff", type: "text" },
      { key: "bgColor", value: "#111827", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("seasonCardId"),
  }),
  req({
    name: "Get Season Card By ID",
    method: "GET",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}",
  }),
  req({
    name: "Update Season Card",
    method: "PUT",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}",
    body: formBody([
      { key: "title", value: "Best Time Updated", type: "text" },
      { key: "description", value: "Updated season note", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "bannerImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({
    name: "Delete Season Card (Soft)",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}",
  }),
  req({
    name: "Update Season Card Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}/status",
    body: jsonBody({ isActive: true }),
  }),
  req({
    name: "Restore Season Card",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}/restore",
  }),
  req({
    name: "Hard Delete Season Card",
    method: "DELETE",
    raw: "{{baseUrl}}/cms/experience/season-cards/{{seasonCardId}}/hard-delete",
  }),

  req({
    name: "List Hero Sections",
    method: "GET",
    raw: "{{baseUrl}}/cms/experience/hero-sections?country={{country}}&isActive=true",
    query: [
      { key: "country", value: "{{country}}" },
      { key: "isActive", value: "true" },
    ],
  }),
  req({
    name: "Upsert Hero Section",
    method: "PUT",
    raw: "{{baseUrl}}/cms/experience/hero-sections/{{sectionKey}}?country={{country}}",
    query: [{ key: "country", value: "{{country}}" }],
    body: formBody([
      { key: "country", value: "{{country}}", type: "text" },
      { key: "eyebrowText", value: "Explore", type: "text" },
      { key: "headingLine1", value: "Plan your", type: "text" },
      { key: "headingLine2", value: "next journey", type: "text" },
      { key: "description", value: "Hero section copy", type: "text" },
      { key: "primaryCtaLabel", value: "Start", type: "text" },
      { key: "primaryCtaUrl", value: "/destinations", type: "text" },
      { key: "secondaryCtaLabel", value: "View More", type: "text" },
      { key: "secondaryCtaUrl", value: "/packages", type: "text" },
      { key: "backgroundImageUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "backgroundImage", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            "try {",
            "  const payload = pm.response.json();",
            "  const data = payload?.data || {};",
            "  if (data?.sectionKey) pm.collectionVariables.set('sectionKey', String(data.sectionKey));",
            "} catch (e) {}",
          ],
        },
      },
    ],
  }),
]);

const mediaFolder = folder("Media", [
  req({
    name: "Upload",
    method: "POST",
    raw: "{{baseUrl}}/cms/media/upload",
    body: formBody([{ key: "media", type: "file", src: "{{sampleImagePath}}" }]),
    events: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            "try {",
            "  const payload = pm.response.json();",
            "  const data = payload?.data || {};",
            "  if (data?.url) pm.collectionVariables.set('sampleImageUrl', String(data.url));",
            "} catch (e) {}",
          ],
        },
      },
    ],
  }),
  req({
    name: "List",
    method: "GET",
    raw: "{{baseUrl}}/cms/media?entityType={{entityType}}&entityId={{entityId}}&mediaKind=image&isActive=true",
    query: [
      { key: "entityType", value: "{{entityType}}" },
      { key: "entityId", value: "{{entityId}}" },
      { key: "mediaKind", value: "image" },
      { key: "isActive", value: "true" },
    ],
  }),
  req({
    name: "Create",
    method: "POST",
    raw: "{{baseUrl}}/cms/media",
    body: formBody([
      { key: "entityType", value: "{{entityType}}", type: "text" },
      { key: "entityId", value: "{{entityId}}", type: "text" },
      { key: "mediaKind", value: "image", type: "text" },
      { key: "mediaUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "thumbnailUrl", value: "{{sampleImageUrl}}", type: "text" },
      { key: "title", value: "CMS Media", type: "text" },
      { key: "altText", value: "Alt text", type: "text" },
      { key: "displayOrder", value: "1", type: "text" },
      { key: "isPrimary", value: "false", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "media", type: "file", src: "{{sampleImagePath}}" },
    ]),
    events: idCaptureScript("mediaId"),
  }),
  req({ name: "Get By ID", method: "GET", raw: "{{baseUrl}}/cms/media/{{mediaId}}" }),
  req({
    name: "Update",
    method: "PUT",
    raw: "{{baseUrl}}/cms/media/{{mediaId}}",
    body: formBody([
      { key: "title", value: "CMS Media Updated", type: "text" },
      { key: "altText", value: "Updated alt", type: "text" },
      { key: "displayOrder", value: "2", type: "text" },
      { key: "isPrimary", value: "true", type: "text" },
      { key: "isActive", value: "true", type: "text" },
      { key: "media", type: "file", src: "{{sampleImagePath}}" },
    ]),
  }),
  req({ name: "Delete", method: "DELETE", raw: "{{baseUrl}}/cms/media/{{mediaId}}" }),
  req({
    name: "Update Status",
    method: "PATCH",
    raw: "{{baseUrl}}/cms/media/{{mediaId}}/status",
    body: jsonBody({ isActive: true }),
  }),
]);

const cmsProtected = folder(
  "CMS Protected",
  [landingFolder, destinationsFolder, packagesFolder, visaFolder, experienceFolder, mediaFolder],
  {
    auth: {
      type: "bearer",
      bearer: [{ key: "token", value: "{{cmsToken}}", type: "string" }],
    },
  },
);

function makePublicFolder(prefixName, prefixPath) {
  return folder(prefixName, [
    req({
      name: "Home",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/home?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Landing Places",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/landing-places?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Destinations",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations?country={{country}}&region={{region}}&category={{category}}&isPopular=true`,
      query: [
        { key: "country", value: "{{country}}" },
        { key: "region", value: "{{region}}" },
        { key: "category", value: "{{category}}" },
        { key: "isPopular", value: "true" },
      ],
    }),
    req({
      name: "Destination By Slug",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations/{{slug}}?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Destination Highlights",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations/{{slug}}/highlights?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Destination Media",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations/{{slug}}/media?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Destination Season Cards",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations/{{slug}}/season-cards?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Destination Packages",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/destinations/{{slug}}/packages?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Published Packages",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/packages/published?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Main Packages",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/packages/main?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Sub Packages By Main",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/packages/main/{{mainPackageId}}/sub?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Visa Destinations",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/visa-destinations?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Visa Destination By Slug",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/visa-destinations/{{slug}}?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
    req({
      name: "Visa Details By Slug",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/visa-destinations/{{slug}}/details?country={{country}}&sectionType=overview`,
      query: [
        { key: "country", value: "{{country}}" },
        { key: "sectionType", value: "overview" },
      ],
    }),
    req({
      name: "Featured Picks",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/featured-picks?country={{country}}&campaignType=featured&sectionKey=featured-hot-picks`,
      query: [
        { key: "country", value: "{{country}}" },
        { key: "campaignType", value: "featured" },
        { key: "sectionKey", value: "featured-hot-picks" },
      ],
    }),
    req({
      name: "Creative Toolkit",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/creative-toolkit?country={{country}}&campaignType=creative&sectionKey=creative-toolkit`,
      query: [
        { key: "country", value: "{{country}}" },
        { key: "campaignType", value: "creative" },
        { key: "sectionKey", value: "creative-toolkit" },
      ],
    }),
    req({
      name: "Season Cards",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/season-cards?country={{country}}&destinationId={{destinationId}}&destinationSlug={{slug}}`,
      query: [
        { key: "country", value: "{{country}}" },
        { key: "destinationId", value: "{{destinationId}}" },
        { key: "destinationSlug", value: "{{slug}}" },
      ],
    }),
    req({
      name: "Hero Sections",
      method: "GET",
      raw: `{{baseUrl}}${prefixPath}/hero-sections?country={{country}}`,
      query: [{ key: "country", value: "{{country}}" }],
    }),
  ]);
}

const publicCmsFolder = folder("Public CMS", [
  makePublicFolder("API Prefix (/api/public/cms)", "/api/public/cms"),
  makePublicFolder("Direct Prefix (/public/cms)", "/public/cms"),
]);

collection.item = [authFolder, healthFolder, cmsProtected, publicCmsFolder];

const out = `${JSON.stringify(collection, null, 2)}\n`;
fs.writeFileSync("postman/CMS.postman_collection.json", out);
console.log("Generated postman/CMS.postman_collection.json");
