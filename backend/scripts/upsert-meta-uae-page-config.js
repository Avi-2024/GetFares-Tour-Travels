#!/usr/bin/env node
/**
 * Upsert UAE Meta page config into database.
 * Runtime webhook lookup stays database-only.
 */
import dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name) {
  return String(process.env[name] || "").trim() || undefined;
}

async function main() {
  const { createApp } = await import("../src/app.js");
  const { container, modules } = createApp();
  const pageConfigService =
    modules?.crm?.metaWebhook?.pageConfigService ||
    modules?.metaWebhook?.pageConfigService;

  if (!pageConfigService) {
    throw new Error("meta page config service not found");
  }

  const pageId = requireEnv("META_UAE_PAGE_ID");
  const body = {
    pageId,
    pageName: optionalEnv("META_UAE_PAGE_NAME") || "UAE Page",
    countryCode: "AE",
    countryName: "United Arab Emirates",
    sourceLabel: "Meta UAE Page",
    accessToken: optionalEnv("META_UAE_ACCESS_TOKEN"),
    appSecret: optionalEnv("META_UAE_APP_SECRET"),
    verifyToken: optionalEnv("META_UAE_VERIFY_TOKEN"),
    graphVersion: optionalEnv("META_GRAPH_VERSION"),
    graphBaseUrl: optionalEnv("META_GRAPH_BASE_URL"),
    graphFields: optionalEnv("META_GRAPH_FIELDS"),
    isActive: true,
    confirmSecrets: true,
  };

  try {
    const pages = await pageConfigService.listPages({});
    const existing = pages.find((page) => String(page.pageId) === pageId);
    const saved =
      existing ?
        await pageConfigService.updatePage(existing.id, body)
      : await pageConfigService.createPage(body);

    console.log("UAE Meta page saved:", {
      id: saved.id,
      pageId: saved.pageId,
      pageName: saved.pageName,
      countryCode: saved.countryCode,
      countryName: saved.countryName,
      sourceLabel: saved.sourceLabel,
      isActive: saved.isActive,
      accessTokenConfigured: saved.secrets?.accessToken?.configured === true,
      appSecretConfigured: saved.secrets?.appSecret?.configured === true,
      verifyTokenConfigured: saved.secrets?.verifyToken?.configured === true,
    });
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
