import fs from "node:fs";
import path from "node:path";

class WebhookFileLogger {
  constructor(logDir = "logs") {
    this.logDir = path.resolve(process.cwd(), logDir);
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFilePath() {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    return path.join(this.logDir, `meta-webhook-${dateStr}.log`);
  }

  formatTimestamp() {
    return new Date().toISOString();
  }

  formatLogEntry(level, message, data = null) {
    const timestamp = this.formatTimestamp();
    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message,
    };

    if (data) {
      entry.data = data;
    }

    return JSON.stringify(entry, null, 2);
  }

  write(level, message, data = null) {
    try {
      const logEntry = this.formatLogEntry(level, message, data);
      const separator = "\n" + "=".repeat(80) + "\n";
      const logLine = separator + logEntry + "\n";

      const logFile = this.getLogFilePath();
      fs.appendFileSync(logFile, logLine, "utf8");
    } catch (error) {
      console.error("Failed to write to webhook log file:", error);
    }
  }

  info(message, data = null) {
    this.write("info", message, data);
  }

  error(message, data = null) {
    this.write("error", message, data);
  }

  debug(message, data = null) {
    this.write("debug", message, data);
  }

  warn(message, data = null) {
    this.write("warn", message, data);
  }

  logVerification(query) {
    this.info("Webhook Verification Request", {
      mode: query["hub.mode"],
      verifyToken: query["hub.verify_token"] ? "[PRESENT]" : "[MISSING]",
      challenge: query["hub.challenge"] ? "[PRESENT]" : "[MISSING]",
      fullQuery: query,
    });
  }

  logWebhookReceived(headers, body, rawBodyLength) {
    this.info("Webhook POST Request Received", {
      timestamp: new Date().toISOString(),
      headers: {
        contentType: headers["content-type"],
        signature: headers["x-hub-signature-256"] ? "[PRESENT]" : "[MISSING]",
        userAgent: headers["user-agent"],
      },
      body,
      rawBodyLength,
    });
  }

  logSignatureValidation(passed, secretsCount) {
    if (passed) {
      this.info("Signature Validation Passed", { secretsCount });
    } else {
      this.error("Signature Validation Failed", { secretsCount });
    }
  }

  logLeadEvents(events) {
    this.info("Lead Events Extracted", {
      count: events.length,
      events: events.map((e) => ({
        leadgenId: e.leadgenId,
        pageId: e.pageId,
        formId: e.formId,
        campaignId: e.campaignId,
      })),
    });
  }

  logPageConfigResolution(pageId, found, config = null) {
    if (found) {
      this.info("Page Config Found", {
        pageId,
        pageName: config?.pageName,
        countryName: config?.countryName,
        countryCode: config?.countryCode,
        sourceLabel: config?.sourceLabel,
      });
    } else {
      this.error("Page Config Not Found", { pageId });
    }
  }

  logMetaLeadFetched(leadgenId, metaLead) {
    this.info("Meta Lead Data Fetched", {
      leadgenId,
      createdTime: metaLead?.created_time,
      fieldCount: Array.isArray(metaLead?.field_data)
        ? metaLead.field_data.length
        : 0,
      fields: metaLead?.field_data?.map((f) => ({
        name: f.name,
        hasValue: f.values && f.values.length > 0,
      })),
      campaignId: metaLead?.campaign_id,
      adId: metaLead?.ad_id,
    });
  }

  logLeadPayload(leadgenId, payload) {
    this.info("Lead Payload Built", {
      leadgenId,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      source: payload.source,
      leadCountry: payload.leadCountry,
      campaignId: payload.campaignId,
      metaLeadId: payload.metaLeadId,
      metaPageId: payload.metaPageId,
      metaCampaignId: payload.metaCampaignId,
    });
  }

  logLeadCreated(leadgenId, leadId, duplicate) {
    if (duplicate) {
      this.warn("Duplicate Lead Detected", { leadgenId, leadId });
    } else {
      this.info("Lead Created Successfully", { leadgenId, leadId });
    }
  }

  logLeadCreationError(leadgenId, error) {
    this.error("Lead Creation Failed", {
      leadgenId,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
    });
  }

  logProcessingSummary(summary) {
    this.info("Webhook Processing Complete", {
      processed: summary.processed,
      duplicates: summary.duplicates,
      skipped: summary.skipped,
      totalLeads: summary.leads?.length || 0,
    });
  }

  logError(context, error) {
    this.error("Webhook Processing Error", {
      context,
      errorMessage: error.message,
      errorCode: error.code,
      errorStack: error.stack,
    });
  }

  logServiceInitialization(config) {
    this.info("Meta Lead Service Initialized", {
      verifyTokenConfigured: config.verifyToken ? "YES" : "NO",
      appSecretConfigured: config.appSecret ? "YES" : "NO",
      allowInsecureWebhooks: config.allowInsecureWebhooks,
      pagesCount: config.pages?.length || 0,
      pages: config.pages?.map((p) => ({
        pageId: p.pageId,
        pageName: p.pageName,
        countryName: p.countryName,
        countryCode: p.countryCode,
        accessTokenConfigured: p.accessToken ? "YES" : "NO",
        appSecretConfigured: p.appSecret ? "YES" : "NO",
      })),
    });
  }
}

// Singleton instance
let fileLoggerInstance = null;

function getWebhookFileLogger() {
  if (!fileLoggerInstance) {
    fileLoggerInstance = new WebhookFileLogger();
  }
  return fileLoggerInstance;
}

export { WebhookFileLogger, getWebhookFileLogger };
