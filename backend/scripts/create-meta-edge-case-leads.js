#!/usr/bin/env node
/**
 * Create controlled Meta webhook leads for India/UAE mapping edge cases.
 * Run: node scripts/create-meta-edge-case-leads.js
 */
import { createApp } from "../src/app.js";

const INDIA_PAGE_ID = "1021995967663811";
const UAE_PAGE_ID = "958886697315918";
const FORM_ID = "1424002562747237";

const stamp = Date.now();

function field(name, value) {
  return { name, values: [value] };
}

const scenarios = [
  {
    label: "lead-1",
    pageId: INDIA_PAGE_ID,
    leadgenId: `testcrm_edge_india_lead_1_${stamp}`,
    fields: [
      field("full_name", "lead-1"),
      field("email", `lead-1.${stamp}@getfares.com`),
      field("phone_number", `9198765${String(stamp).slice(-5)}`),
      field("city", "Mumbai"),
      field("what_is_your_nationality?", "Indian"),
      field("which_destination_would_you_like_to_visit?", "Dubai"),
    ],
    expect: {
      source: "Meta India Page",
      nationality: "Indian",
      travelTo: "Dubai",
      leadCountry: "India",
    },
  },
  {
    label: "lead-2",
    pageId: UAE_PAGE_ID,
    leadgenId: `testcrm_edge_uae_lead_2_${stamp}`,
    fields: [
      field("full_name", "lead-2"),
      field("email", `lead-2.${stamp}@getfares.com`),
      field("phone_number", `9715012${String(stamp).slice(-5)}`),
      field("city", "Dubai"),
      field("what_is_your_nationality?", "Indian"),
      field("which_destination_would_you_like_to_visit?", "Maldives"),
    ],
    expect: {
      source: "Meta UAE Page",
      nationality: "Indian",
      travelTo: "Maldives",
      leadCountry: "United Arab Emirates",
    },
  },
  {
    label: "edge-alias-simple",
    pageId: INDIA_PAGE_ID,
    leadgenId: `testcrm_edge_alias_simple_${stamp}`,
    fields: [
      field("full_name", "edge-alias-simple"),
      field("email", `edge-alias-simple.${stamp}@getfares.com`),
      field("phone_number", `9198700${String(stamp).slice(-5)}`),
      field("nationality", "Indian"),
      field("destination", "Thailand"),
    ],
    expect: {
      source: "Meta India Page",
      nationality: "Indian",
      travelTo: "Thailand",
      leadCountry: "India",
    },
  },
  {
    label: "edge-passport-question",
    pageId: UAE_PAGE_ID,
    leadgenId: `testcrm_edge_passport_question_${stamp}`,
    fields: [
      field("full_name", "edge-passport-question"),
      field("email", `edge-passport-question.${stamp}@getfares.com`),
      field("phone_number", `9715099${String(stamp).slice(-5)}`),
      field("what_is_your_passport_nationality", "Pakistani"),
      field("where_do_you_want_to_travel", "Georgia"),
    ],
    expect: {
      source: "Meta UAE Page",
      nationality: "Pakistani",
      travelTo: "Georgia",
      leadCountry: "United Arab Emirates",
    },
  },
  {
    label: "edge-multiple-destinations",
    pageId: UAE_PAGE_ID,
    leadgenId: `testcrm_edge_multi_destination_${stamp}`,
    fields: [
      field("full_name", "edge-multiple-destinations"),
      field("email", `edge-multiple-destinations.${stamp}@getfares.com`),
      field("phone_number", `9715088${String(stamp).slice(-5)}`),
      field("your_nationality", "Filipino"),
      field(
        "which_destinations_are_you_interested_in_you_can_mention_multiple?",
        "Bali, Singapore",
      ),
    ],
    expect: {
      source: "Meta UAE Page",
      nationality: "Filipino",
      travelTo: "Bali, Singapore",
      leadCountry: "United Arab Emirates",
    },
  },
  {
    label: "edge-missing-optional",
    pageId: INDIA_PAGE_ID,
    leadgenId: `testcrm_edge_missing_optional_${stamp}`,
    fields: [
      field("full_name", "edge-missing-optional"),
      field("email", `edge-missing-optional.${stamp}@getfares.com`),
      field("phone_number", `9198711${String(stamp).slice(-5)}`),
      field("city", "Delhi"),
    ],
    expect: {
      source: "Meta India Page",
      nationality: null,
      travelTo: null,
      leadCountry: "India",
    },
  },
];

function assertEqual(actual, expected, message) {
  if (expected === null) {
    if (actual !== null && actual !== undefined && actual !== "") {
      throw new Error(`${message}: expected blank, got ${actual}`);
    }
    return;
  }
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  const { container, modules } = createApp();
  const service =
    modules?.crm?.metaWebhook?.service || modules?.metaWebhook?.service;

  if (!service?.createTestLead) {
    throw new Error("meta webhook createTestLead service not found");
  }

  const created = [];
  try {
    for (const scenario of scenarios) {
      const result = await service.createTestLead(
        {
          fieldData: scenario.fields,
          metaPageId: scenario.pageId,
          metaFormId: FORM_ID,
          leadgenId: scenario.leadgenId,
        },
        { requestId: `edge-case-${stamp}` },
      );

      const lead = result.lead;
      if (!lead?.id) {
        throw new Error(`${scenario.label}: lead was not created`);
      }

      assertEqual(lead.fullName, scenario.label, `${scenario.label} fullName`);
      assertEqual(lead.source, scenario.expect.source, `${scenario.label} source`);
      assertEqual(
        lead.nationality,
        scenario.expect.nationality,
        `${scenario.label} nationality`,
      );
      assertEqual(
        lead.travelTo,
        scenario.expect.travelTo,
        `${scenario.label} destination`,
      );
      assertEqual(
        lead.leadCountry,
        scenario.expect.leadCountry,
        `${scenario.label} leadCountry`,
      );

      created.push({
        label: scenario.label,
        leadId: lead.id,
        leadCode: lead.leadCode,
        source: lead.source,
        nationality: lead.nationality ?? null,
        destination: lead.travelTo ?? null,
        leadCountry: lead.leadCountry ?? null,
        metaLeadId: lead.metaLeadId,
      });
    }
  } finally {
    if (typeof container.db?.close === "function") {
      await container.db.close();
    }
    if (typeof container.logger?.close === "function") {
      await container.logger.close();
    }
  }

  console.log(JSON.stringify({ created }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
