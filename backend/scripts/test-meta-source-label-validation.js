/**
 * Offline validation checks for Meta mapping source labels.
 * Run: node scripts/test-meta-source-label-validation.js
 */
import { MetaLeadMappingValidation } from "../crm/modules/metaWebhook/metaLeadMapping.validation.js";

const validProfile = {
  name: "India Page Rule",
  scopeType: "page",
  scopeId: "1021995967663811",
  priority: 100,
  leadType: "VISA",
  leadCountry: "India",
  clientCurrency: "INR",
  isActive: true,
};

const cases = [
  {
    name: "create accepts Meta India Page",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "Meta India Page" } },
    ok: true,
    expectedSourceLabel: "Meta India Page",
  },
  {
    name: "create accepts Meta UAE Page",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "Meta UAE Page" } },
    ok: true,
    expectedSourceLabel: "Meta UAE Page",
  },
  {
    name: "create trims valid source label",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "  Meta India Page  " } },
    ok: true,
    expectedSourceLabel: "Meta India Page",
  },
  {
    name: "create allows null source label",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: null } },
    ok: true,
    expectedSourceLabel: null,
  },
  {
    name: "create allows omitted source label",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: validProfile },
    ok: true,
    expectedSourceLabel: undefined,
  },
  {
    name: "create rejects blank source label",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "" } },
    ok: false,
  },
  {
    name: "create rejects unknown source label",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "Google Ads" } },
    ok: false,
  },
  {
    name: "create rejects case mismatch",
    schema: MetaLeadMappingValidation.createProfile,
    input: { body: { ...validProfile, sourceLabel: "meta india page" } },
    ok: false,
  },
  {
    name: "update accepts Meta India Page",
    schema: MetaLeadMappingValidation.updateProfile,
    input: {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      body: { sourceLabel: "Meta India Page" },
    },
    ok: true,
    expectedSourceLabel: "Meta India Page",
  },
  {
    name: "update accepts Meta UAE Page",
    schema: MetaLeadMappingValidation.updateProfile,
    input: {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      body: { sourceLabel: "Meta UAE Page" },
    },
    ok: true,
    expectedSourceLabel: "Meta UAE Page",
  },
  {
    name: "update allows null source label",
    schema: MetaLeadMappingValidation.updateProfile,
    input: {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      body: { sourceLabel: null },
    },
    ok: true,
    expectedSourceLabel: null,
  },
  {
    name: "update rejects unknown source label",
    schema: MetaLeadMappingValidation.updateProfile,
    input: {
      params: { id: "11111111-1111-4111-8111-111111111111" },
      body: { sourceLabel: "Website" },
    },
    ok: false,
  },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const item of cases) {
  const result = item.schema.safeParse(item.input);
  assert(result.success === item.ok, `${item.name}: expected ${item.ok}`);

  if (item.ok && "expectedSourceLabel" in item) {
    assert(
      result.data.body.sourceLabel === item.expectedSourceLabel,
      `${item.name}: sourceLabel mismatch`,
    );
  }
}

console.log(`Meta source label validation checks passed (${cases.length}).`);
