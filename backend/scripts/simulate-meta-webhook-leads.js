#!/usr/bin/env node
/**
 * Simulate Meta leadgen webhooks for India + UAE (full webhook pipeline).
 *
 * Uses mock Meta Graph data when leadgen_id starts with `testcrm_` and
 * META_ALLOW_INSECURE_WEBHOOKS=true (see metaLead.service fetchLeadWithRetry).
 *
 * Usage:
 *   node scripts/simulate-meta-webhook-leads.js          # direct (no HTTP)
 *   node scripts/simulate-meta-webhook-leads.js --http   # POST running server
 */
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const useHttp = process.argv.includes("--http");
const port = Number(process.env.PORT || 3000);
const baseUrl = String(process.env.API_BASE_URL || `http://127.0.0.1:${port}`).replace(
  /\/+$/,
  "",
);

const indiaPageId = String(process.env.META_INDIA_PAGE_ID || "1021995967663811").trim();
const uaePageId = String(process.env.META_UAE_PAGE_ID || "958886697315918").trim();

const stamp = Date.now();

const scenarios = [
  {
    label: "India",
    pageId: indiaPageId,
    leadgenId: `testcrm_india_${stamp}`,
  },
  {
    label: "UAE",
    pageId: uaePageId,
    leadgenId: `testcrm_uae_${stamp}`,
  },
];

function buildWebhookPayload(pageId, leadgenId) {
  return {
    object: "page",
    entry: [
      {
        id: pageId,
        changes: [
          {
            field: "leadgen",
            value: {
              leadgen_id: leadgenId,
              page_id: pageId,
              form_id: "1424002562747237",
            },
          },
        ],
      },
    ],
  };
}

async function runDirect(scenario) {
  const { createApp } = await import("../src/app.js");
  const { app: _app, container, modules } = createApp();
  void _app;

  try {
    const service = modules?.crm?.metaWebhook?.service || modules?.metaWebhook?.service;
    if (!service?.handleWebhook) {
      throw new Error("metaWebhook service not found on app modules");
    }

    const payload = buildWebhookPayload(scenario.pageId, scenario.leadgenId);
    const raw = JSON.stringify(payload);

    console.log(`\n--- ${scenario.label} direct (${scenario.leadgenId}) ---`);

    const summary = await service.handleWebhook(payload, { rawBody: raw }, null);

    const row = Array.isArray(summary?.results) ?
      summary.results.find((r) => r?.lead?.id)
    : null;

    if (row?.lead?.id) {
      console.log(
        `Lead: ${row.lead.id} | ${row.lead.fullName} | ${row.lead.leadCountry || row.lead.country} | status=${row.lead.status}`,
      );
      console.log(`Source: ${row.lead.source} | metaLeadId: ${row.lead.metaLeadId || scenario.leadgenId}`);
    } else {
      console.log("Summary:", JSON.stringify(summary, null, 2));
    }

    return { ok: true, scenario, summary, lead: row?.lead || null };
  } finally {
    if (typeof container.db?.close === "function") {
      await container.db.close();
    }
    if (typeof container.logger?.close === "function") {
      await container.logger.close();
    }
  }
}

async function runHttp(scenario) {
  const body = buildWebhookPayload(scenario.pageId, scenario.leadgenId);
  const raw = JSON.stringify(body);
  const url = `${baseUrl}/webhook/meta`;

  console.log(`\n--- ${scenario.label} HTTP (${scenario.leadgenId}) ---`);
  console.log(`POST ${url}`);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error(`HTTP ${res.status}`, JSON.stringify(json, null, 2));
    return { ok: false, scenario, json };
  }

  console.log("Response:", JSON.stringify(json, null, 2));
  const results = json?.data?.results || [];
  const lead = results.find((r) => r?.lead?.id)?.lead || null;
  if (lead?.id) {
    console.log(`Lead: ${lead.id} | ${lead.fullName} | ${lead.leadCountry || lead.country}`);
  }
  return { ok: true, scenario, json, lead };
}

async function main() {
  if (process.env.META_ALLOW_INSECURE_WEBHOOKS !== "true") {
    console.warn(
      "Set META_ALLOW_INSECURE_WEBHOOKS=true in .env for testcrm_ mock leads.",
    );
  }

  console.log("Meta webhook simulation", useHttp ? "(HTTP)" : "(direct service)");
  console.log("India page:", indiaPageId);
  console.log("UAE page:", uaePageId);

  const runner = useHttp ? runHttp : runDirect;
  const outcomes = [];
  for (const scenario of scenarios) {
    outcomes.push(await runner(scenario));
  }

  const failed = outcomes.filter((o) => !o.ok);
  if (failed.length) {
    process.exitCode = 1;
    console.error(`\n${failed.length} webhook(s) failed.`);
    if (useHttp) {
      console.error("Tip: restart backend after code change, or run without --http");
    }
    return;
  }

  console.log("\nDone. Leads created via Meta webhook flow (OPEN + Meta source).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
