/**
 * Smoke tests for Meta lead mapping resolver + buildLeadPayload wiring.
 * Run: node test-meta-lead-mapping.js
 */
import { createMetaLeadMappingResolver } from "./crm/modules/metaWebhook/metaLeadMapping.resolver.js";
import { LeadFieldsUtils } from "./crm/modules/leads/leadFields.utils.js";

const { flattenMetaFieldData } = LeadFieldsUtils;

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  OK ${message}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${message}`);
  }
}

const mockProfiles = [
  {
    id: "visa-form",
    name: "UK Visa",
    scopeType: "form",
    scopeId: "964456066326392",
    priority: 10,
    leadType: "VISA",
    leadCountry: null,
    sourceLabel: "Getfares",
    isActive: true,
    fieldMaps: [
      {
        id: "m1",
        metaFieldKeys: ["what_is_your_nationality"],
        targetColumn: "nationality",
        transform: "normalize_nationality",
        stripFromDynamic: true,
        sortOrder: 10,
        isActive: true,
      },
      {
        id: "m2",
        metaFieldKeys: ["which_visa_assistance_are_you_looking_for"],
        targetColumn: "travel_to",
        transform: "truncate_150",
        stripFromDynamic: true,
        sortOrder: 20,
        isActive: true,
      },
    ],
  },
  {
    id: "pkg-form",
    name: "India Packages",
    scopeType: "form",
    scopeId: "35414224904842634",
    priority: 20,
    leadType: "HOLIDAY",
    leadCountry: null,
    sourceLabel: null,
    isActive: true,
    fieldMaps: [
      {
        id: "m3",
        metaFieldKeys: [
          "which_destination_would_you_like_to_visit",
          "which_destinations_are_you_interested_in",
        ],
        targetColumn: "travel_to",
        transform: "truncate_150",
        stripFromDynamic: true,
        sortOrder: 10,
        isActive: true,
      },
      {
        id: "m4",
        metaFieldKeys: ["what_is_your_budget_per_person"],
        targetColumn: "budget",
        transform: "parse_budget",
        stripFromDynamic: true,
        sortOrder: 20,
        isActive: true,
      },
    ],
  },
];

const repository = {
  async listActiveProfilesWithMaps() {
    return mockProfiles;
  },
};

const resolver = createMetaLeadMappingResolver({ repository, logger: null });

console.log("\n=== Visa form ===\n");
const visa = await resolver.resolveAndApply({
  fieldData: [
    { name: "full_name", values: ["Tapash Kanti Das"] },
    { name: "email", values: ["tapash@yahoo.com"] },
    { name: "phone_number", values: ["+971509475275"] },
    { name: "what_is_your_nationality?", values: ["Bangladesh"] },
    {
      name: "which_visa_assistance_are_you_looking_for?",
      values: ["uk_tourist_visa"],
    },
    { name: "do_you_have_6_months_of_passport_validity?", values: ["yes"] },
  ],
  scope: { metaFormId: "964456066326392" },
});

assert(visa.matchedProfileId === "visa-form", "visa profile matched");
assert(visa.payload.nationality === "Bangladesh", "nationality mapped");
assert(visa.payload.travelTo === "uk_tourist_visa", "visa type → travel_to");
assert(visa.profileAssign?.leadType === "VISA", "profile lead type");
assert(
  visa.dynamic.do_you_have_6_months_of_passport_validity === "yes",
  "unmapped stays dynamic",
);
assert(
  visa.dynamic.what_is_your_nationality === undefined,
  "mapped keys stripped from dynamic",
);

console.log("\n=== Package form ===\n");
const pkg = await resolver.resolveAndApply({
  fieldData: [
    { name: "full_name", values: ["Milind Dambe"] },
    { name: "which_destination_would_you_like_to_visit?", values: ["vietnam"] },
    { name: "what_is_your_budget_per_person?", values: ["<_40k"] },
    {
      name: "which_destinations_are_you_interested_in? (you can mention multiple)",
      values: ["Bangkok"],
    },
  ],
  scope: { metaFormId: "35414224904842634" },
});

assert(pkg.payload.travelTo === "vietnam", "destination from single-select");
assert(pkg.payload.budget === 40, "budget parsed from <_40k");
assert(pkg.matchedProfileId === "pkg-form", "package profile matched");

console.log("\n=== Ad scope beats form (mock) ===\n");
const adRepo = {
  async listActiveProfilesWithMaps() {
    return [
      {
        id: "ad-specific",
        name: "Ad override",
        scopeType: "ad",
        scopeId: "120245301739500369",
        priority: 5,
        leadType: "VISA",
        leadCountry: "UAE",
        sourceLabel: "Getfares Ad",
        isActive: true,
        fieldMaps: [],
      },
      mockProfiles[0],
    ];
  },
};
const adResolver = createMetaLeadMappingResolver({ repository: adRepo, logger: null });
const adResult = await adResolver.resolveAndApply({
  fieldData: [{ name: "full_name", values: ["X"] }],
  scope: {
    metaAdId: "120245301739500369",
    metaFormId: "964456066326392",
  },
});
assert(adResult.matchedProfileId === "ad-specific", "ad scope wins over form");

console.log("\n=== No profile — legacy destination ===\n");
const emptyRepo = { async listActiveProfilesWithMaps() { return []; } };
const legacyResolver = createMetaLeadMappingResolver({
  repository: emptyRepo,
  logger: null,
});
const legacy = await legacyResolver.resolveAndApply({
  fieldData: [
    {
      name: "which_destination_would_you_like_to_visit?",
      values: ["bali"],
    },
  ],
  scope: { metaFormId: "unknown" },
  useLegacyFallback: true,
});
assert(legacy.payload.travelTo === "bali", "legacy travel_to fallback");
assert(legacy.matchedProfileId === null, "no profile id");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
