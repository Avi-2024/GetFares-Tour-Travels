import assert from "node:assert/strict";
import http from "node:http";
import { createPartnerIntegrationService } from "../crm/modules/partnerIntegration/partnerIntegration.service.js";

const repository = {
  findCustomer: async (id) => ({ id }),
  findLeadAggregate: async (id) => ({ lead: { id } }),
  findBookingAggregate: async (id) => ({ booking: { id } }),
  listChanges: async ({ afterEpoch, afterEntity, limit, entities }) => {
    assert.equal(afterEpoch, 0);
    assert.equal(afterEntity, "");
    assert.equal(limit, 2);
    assert.deepEqual(entities, ["booking"]);
    return [
      {
        entity_type: "booking",
        entity_id: "38b7e4ee-18c9-457f-9ff0-24cccd899297",
        root_booking_id: "38b7e4ee-18c9-457f-9ff0-24cccd899297",
        is_deleted: 0,
        changed_at: "2026-06-12 10:00:00",
        changed_epoch: 1781267400,
      },
    ];
  },
};

const service = createPartnerIntegrationService({ repository });
const page = await service.listChanges({ limit: 1, entities: "booking" });

assert.equal(page.changes.length, 1);
assert.equal(page.hasMore, false);
assert.ok(page.nextCursor);
assert.equal(
  page.changes[0].resourceUrl,
  "/api/integrations/v1/bookings/38b7e4ee-18c9-457f-9ff0-24cccd899297",
);
assert.equal(
  (await service.getCustomer("c1")).id,
  "c1",
);
assert.equal(
  (await service.getLead("l1")).lead.id,
  "l1",
);
assert.equal(
  (await service.getBooking("b1")).booking.id,
  "b1",
);

console.log("Partner integration tests passed.");

let receivedWebhook = null;
const receiver = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    receivedWebhook = {
      headers: req.headers,
      body: JSON.parse(Buffer.concat(chunks).toString("utf8")),
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end('{"success":true}');
  });
});
await new Promise((resolve) => receiver.listen(0, "127.0.0.1", resolve));
const receiverPort = receiver.address().port;
let endpointRecord;
const webhookRepository = {
  createWebhookEndpoint: async (payload) => {
    endpointRecord = payload;
    return {
      ...payload,
      created_at: "2026-06-12 10:00:00",
      updated_at: "2026-06-12 10:00:00",
    };
  },
  findWebhookEndpoint: async () => ({
    ...endpointRecord,
    webhook_url: `http://127.0.0.1:${receiverPort}/webhook`,
  }),
};
const webhookService = createPartnerIntegrationService({
  repository: webhookRepository,
  encryptionKey: "integration-test-encryption-key",
  logger: { warn() {} },
});
const endpoint = await webhookService.createWebhookEndpoint("client-1", {
  name: "Test receiver",
  webhookUrl: `http://127.0.0.1:${receiverPort}/webhook`,
  subscribedEvents: ["booking.created"],
  isActive: true,
});
assert.ok(endpoint.signingSecret.startsWith("whsec_"));
const testDelivery = await webhookService.testWebhookEndpoint(
  "client-1",
  endpoint.id,
);
assert.equal(testDelivery.delivered, true);
assert.equal(receivedWebhook.body.eventType, "integration.test");
assert.ok(receivedWebhook.headers["x-webhook-signature"]);
await new Promise((resolve) => receiver.close(resolve));

console.log("Partner webhook tests passed.");
