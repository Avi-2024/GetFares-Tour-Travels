/**
 * Offline unit checks for Meta lead mapping resolver (no database).
 * Run: node scripts/test-meta-lead-mapping.js
 */
import { createMetaLeadMappingResolver } from "../crm/modules/metaWebhook/metaLeadMapping.resolver.js";

const mockProfiles = [
  {
    id: "profile-visa",
    name: "UK Visa Form",
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
];

const repository = {
  async listActiveProfilesWithMaps() {
    return mockProfiles;
  },
};

const resolver = createMetaLeadMappingResolver({ repository, logger: null });

const fieldData = [
  { name: "full_name", values: ["Tapash Kanti Das"] },
  { name: "email", values: ["tapash@yahoo.com"] },
  { name: "phone_number", values: ["+971509475275"] },
  { name: "what_is_your_nationality?", values: ["Bangladesh"] },
  {
    name: "which_visa_assistance_are_you_looking_for?",
    values: ["uk_tourist_visa"],
  },
];

const result = await resolver.resolveAndApply({
  fieldData,
  scope: { metaFormId: "964456066326392" },
});

const assert = (cond, msg) => {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
};

assert(result.matchedProfileId === "profile-visa", "profile match");
assert(result.payload.nationality === "Bangladesh", "nationality mapped");
assert(result.payload.travelTo === "uk_tourist_visa", "travel_to mapped");
assert(result.profileAssign.leadType === "VISA", "lead type from profile");
assert(
  result.profileAssign.sourceLabel === null,
  "invalid stored source label ignored",
);
assert(
  result.dynamic.what_is_your_nationality === undefined,
  "stripped from dynamic",
);

const adScope = await resolver.resolveAndApply({
  fieldData: [{ name: "email", values: ["a@b.com"] }],
  scope: { metaFormId: "unknown" },
});
assert(adScope.matchedProfileId === null, "unknown form no profile");

console.log("All meta lead mapping resolver checks passed.");
