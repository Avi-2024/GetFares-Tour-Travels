import { getWebhookFileLogger } from "./webhookFileLogger.js";

function createMetaWebhookController({ service, logger }) {
  const fileLogger = getWebhookFileLogger();
  
  return Object.freeze({
    async verify(req, res) {
      console.log("\n========== META WEBHOOK VERIFICATION ==========");
      console.log("Query params:", req.query);
      console.log("hub.mode:", req.query["hub.mode"]);
      console.log("hub.verify_token:", req.query["hub.verify_token"]);
      console.log("hub.challenge:", req.query["hub.challenge"]);
      
      fileLogger.logVerification(req.query);
      
      logger?.info(
        {
          query: req.query,
          mode: req.query["hub.mode"],
          token: req.query["hub.verify_token"] ? "[PRESENT]" : "[MISSING]",
          challenge: req.query["hub.challenge"] ? "[PRESENT]" : "[MISSING]",
        },
        "Meta webhook verification request received",
      );
      
      try {
        const challenge = await service.verifyWebhook(
          req.validated?.query ?? req.query,
        );
        
        console.log("Verification successful, returning challenge:", challenge);
        logger?.info({ challenge }, "Meta webhook verification successful");
        fileLogger.info("Verification Successful", { challenge });
        
        res.status(200).send(challenge);
      } catch (error) {
        console.error("Verification failed:", error);
        fileLogger.logError("verification", error);
        throw error;
      }
    },

    async receive(req, res) {
      console.log("\n========== META WEBHOOK RECEIVED ==========");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));
      console.log("Raw Body length:", req.rawBody?.length || 0);
      console.log("Signature:", req.headers["x-hub-signature-256"]);
      
      fileLogger.logWebhookReceived(req.headers, req.body, req.rawBody?.length || 0);
      
      logger?.info(
        {
          headers: req.headers,
          body: req.body,
          signature: req.headers["x-hub-signature-256"] ? "[PRESENT]" : "[MISSING]",
          rawBodyLength: req.rawBody?.length || 0,
        },
        "Meta webhook POST request received",
      );
      
      const signature = req.headers["x-hub-signature-256"];
      
      try {
        const summary = await service.handleWebhook(
          req.validated?.body ?? req.body,
          {
            requestId: req.context?.requestId || null,
            rawBody: req.rawBody,
          },
          signature,
        );
        
        console.log("\n========== WEBHOOK PROCESSING COMPLETE ==========");
        console.log("Summary:", JSON.stringify(summary, null, 2));
        
        logger?.info(
          { summary },
          "Meta webhook processing completed successfully",
        );
        
        fileLogger.logProcessingSummary(summary);
        
        res.status(200).json({ data: summary });
      } catch (error) {
        console.error("\n========== WEBHOOK PROCESSING ERROR ==========");
        console.error("Error:", error);
        console.error("Stack:", error.stack);
        
        logger?.error(
          {
            err: error,
            body: req.body,
            signature: req.headers["x-hub-signature-256"] ? "[PRESENT]" : "[MISSING]",
          },
          "Meta webhook processing failed",
        );
        
        fileLogger.logError("webhook_processing", error);
        
        throw error;
      }
    },
  });
}

export { createMetaWebhookController };
