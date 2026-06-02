#!/usr/bin/env node
/**
 * Upsert common Meta form question mappings into active rules.
 * Run: node scripts/upsert-meta-question-maps.js
 */
import { createApp } from "../src/app.js";

const REQUIRED_MAPS = [
  {
    targetColumn: "nationality",
    transform: "normalize_nationality",
    aliases: [
      "what_is_your_nationality",
      "what_is_your_nationality?",
      "nationality",
      "your_nationality",
      "passport_nationality",
      "what_is_your_passport_nationality",
    ],
  },
  {
    targetColumn: "travel_to",
    transform: "truncate_150",
    aliases: [
      "which_destination_would_you_like_to_visit",
      "which_destination_would_you_like_to_visit?",
      "which_destinations_are_you_interested_in_you_can_mention_multiple",
      "which_destinations_are_you_interested_in_you_can_mention_multiple?",
      "destination",
      "travel_to",
      "preferred_destination",
      "where_do_you_want_to_travel",
    ],
  },
];

function mergeUnique(existing = [], required = []) {
  return Array.from(
    new Set(
      [...existing, ...required]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

async function main() {
  const { container, modules } = createApp();
  const mappingService =
    modules?.crm?.metaWebhook?.mappingService ||
    modules?.metaWebhook?.mappingService;
  const pageConfigService =
    modules?.crm?.metaWebhook?.pageConfigService ||
    modules?.metaWebhook?.pageConfigService;

  if (!mappingService) {
    throw new Error("meta lead mapping service not found");
  }
  if (!pageConfigService) {
    throw new Error("meta page config service not found");
  }

  try {
    const pages = await pageConfigService.listPages({ isActive: true });
    let profiles = await mappingService.listProfiles({ isActive: true });

    for (const page of pages) {
      const sourceLabel = String(page.sourceLabel || "").trim();
      if (!["Meta India Page", "Meta UAE Page"].includes(sourceLabel)) {
        continue;
      }
      const existing = profiles.find(
        (profile) =>
          profile.isActive !== false &&
          profile.scopeType === "page" &&
          String(profile.scopeId) === String(page.pageId),
      );
      if (existing) {
        continue;
      }

      await mappingService.createProfile({
        name: `${page.pageName || sourceLabel} rule`,
        scopeType: "page",
        scopeId: String(page.pageId),
        priority: sourceLabel === "Meta India Page" ? 100 : 110,
        leadType: sourceLabel === "Meta India Page" ? "VISA" : "HOLIDAY",
        leadCountry:
          sourceLabel === "Meta India Page" ?
            "India"
          : "United Arab Emirates",
        clientCurrency: sourceLabel === "Meta India Page" ? "INR" : "AED",
        sourceLabel,
        isActive: true,
      });
    }

    profiles = await mappingService.listProfiles({ isActive: true });
    const changed = [];

    for (const profile of profiles) {
      for (const rule of REQUIRED_MAPS) {
        const existing = (profile.fieldMaps || []).find(
          (map) =>
            map.isActive !== false && map.targetColumn === rule.targetColumn,
        );
        const metaFieldKeys = mergeUnique(
          existing?.metaFieldKeys || [],
          rule.aliases,
        );

        if (existing) {
          await mappingService.updateFieldMap(existing.id, {
            metaFieldKeys,
            targetColumn: rule.targetColumn,
            transform: rule.transform,
            stripFromDynamic: true,
            isActive: true,
          });
          changed.push({
            profile: profile.name,
            action: "updated",
            targetColumn: rule.targetColumn,
            keys: metaFieldKeys,
          });
        } else {
          await mappingService.createFieldMap(profile.id, {
            metaFieldKeys,
            targetColumn: rule.targetColumn,
            transform: rule.transform,
            stripFromDynamic: true,
            sortOrder: rule.targetColumn === "nationality" ? 10 : 20,
          });
          changed.push({
            profile: profile.name,
            action: "created",
            targetColumn: rule.targetColumn,
            keys: metaFieldKeys,
          });
        }
      }
    }

    await mappingService.reloadCache();
    console.log(JSON.stringify({ profiles: profiles.length, changed }, null, 2));
  } finally {
    if (typeof container.db?.close === "function") {
      await container.db.close();
    }
    if (typeof container.logger?.close === "function") {
      await container.logger.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
