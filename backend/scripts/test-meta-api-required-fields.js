#!/usr/bin/env node
/**
 * Offline checks for Meta Graph lead fields.
 * Run: node scripts/test-meta-api-required-fields.js
 */
import { createMetaApi } from "../crm/modules/metaWebhook/metaApi.js";

const originalFetch = globalThis.fetch;
const calls = [];

globalThis.fetch = async (url) => {
  calls.push(new URL(url));
  return {
    ok: true,
    status: 200,
    async json() {
      return { id: "lead-1", field_data: [] };
    },
  };
};

const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
};

try {
  const api = createMetaApi({
    accessToken: "token",
    graphBaseUrl: "https://graph.facebook.com",
    graphVersion: "v20.0",
    graphFields: "field_data,created_time,page_id",
  });

  await api.fetchLead("lead-1");

  const fields = calls[0].searchParams.get("fields").split(",");
  for (const field of [
    "field_data",
    "created_time",
    "ad_id",
    "adset_id",
    "campaign_id",
    "form_id",
  ]) {
    assert(fields.includes(field), `${field} included`);
  }

  assert(!fields.includes("page_id"), "page_id excluded");

  await api.fetchLead("lead-2", { graphFields: "field_data" });
  const runtimeFields = calls[1].searchParams.get("fields").split(",");
  assert(runtimeFields.includes("ad_id"), "runtime ad_id included");
  assert(runtimeFields.includes("form_id"), "runtime form_id included");

  console.log("All Meta API required field checks passed.");
} finally {
  globalThis.fetch = originalFetch;
}
