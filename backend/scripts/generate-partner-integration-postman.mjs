import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const outputDir = path.join(root, "postman");
fs.mkdirSync(outputDir, { recursive: true });

const headers = [
  { key: "X-Client-Id", value: "{{clientId}}", type: "text" },
  { key: "X-API-Key", value: "{{apiKey}}", type: "text" },
  { key: "X-Request-Id", value: "postman-{{$guid}}", type: "text" },
];

const statusTest = (status) => ({
  listen: "test",
  script: {
    type: "text/javascript",
    exec: [`pm.test("Status is ${status}", () => pm.response.to.have.status(${status}));`],
  },
});

const jsonRequest = ({ name, method = "GET", url, body, tests = [], description }) => ({
  name,
  request: {
    method,
    header: body
      ? [...headers, { key: "Content-Type", value: "application/json", type: "text" }]
      : headers,
    body: body
      ? { mode: "raw", raw: JSON.stringify(body, null, 2), options: { raw: { language: "json" } } }
      : undefined,
    url,
    description,
  },
  event: tests,
  response: [],
});

const saveValueTest = (status, assignments) => ({
  listen: "test",
  script: {
    type: "text/javascript",
    exec: [
      `pm.test("Status is ${status}", () => pm.response.to.have.status(${status}));`,
      "const json = pm.response.json();",
      "pm.test('Success response', () => pm.expect(json.success).to.eql(true));",
      ...assignments,
    ],
  },
});

const collection = {
  info: {
    _postman_id: crypto.randomUUID(),
    name: "Partner CRM Integration",
    description: "Minimal production collection for CRM-1 to CRM-2 webhook synchronization.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: { type: "noauth" },
  variable: [{ key: "baseUrl", value: "http://localhost:3000" }],
  item: [
    {
      name: "01 - Connectivity",
      item: [
        jsonRequest({
          name: "Health Check",
          url: "{{baseUrl}}/api/integrations/v1/health",
          tests: [statusTest(200)],
          description: "Validates integration credentials.",
        }),
      ],
    },
    {
      name: "02 - Recovery Change Feed",
      item: [
        jsonRequest({
          name: "Get Initial Changes",
          url: "{{baseUrl}}/api/integrations/v1/changes?limit={{limit}}&entities={{entities}}",
          tests: [
            saveValueTest(200, [
              "if (json.data.nextCursor) pm.environment.set('cursor', json.data.nextCursor);",
              "const booking = json.data.changes.find(item => item.rootBookingId);",
              "if (booking) pm.environment.set('bookingId', booking.rootBookingId);",
            ]),
          ],
          description: "Starts recovery synchronization.",
        }),
        jsonRequest({
          name: "Get Next Changes",
          url: "{{baseUrl}}/api/integrations/v1/changes?cursor={{cursor}}&limit={{limit}}&entities={{entities}}",
          tests: [
            saveValueTest(200, [
              "if (json.data.nextCursor) pm.environment.set('cursor', json.data.nextCursor);",
            ]),
          ],
          description: "Continues recovery synchronization.",
        }),
      ],
    },
    {
      name: "03 - Booking Aggregate",
      item: [
        jsonRequest({
          name: "Get Booking Aggregate",
          url: "{{baseUrl}}/api/integrations/v1/bookings/{{bookingId}}",
          tests: [statusTest(200)],
          description: "Returns customer, lead, quotation, booking, payments, and refunds.",
        }),
      ],
    },
    {
      name: "04 - Webhook Setup",
      item: [
        jsonRequest({
          name: "Create Webhook Endpoint",
          method: "POST",
          url: "{{baseUrl}}/api/integrations/v1/webhook-endpoints",
          body: {
            name: "Client CRM Webhook",
            webhookUrl: "{{webhookUrl}}",
            subscribedEvents: [
              "lead.created",
              "lead.updated",
              "booking.created",
              "booking.updated",
              "payment.created",
              "payment.updated",
              "refund.created",
              "refund.updated",
            ],
            isActive: true,
          },
          tests: [
            saveValueTest(201, [
              "pm.environment.set('webhookEndpointId', json.data.id);",
              "pm.environment.set('webhookSigningSecret', json.data.signingSecret);",
            ]),
          ],
          description: "Registers CRM-2 receiver. Save signingSecret immediately.",
        }),
        jsonRequest({
          name: "Send Immediate Test",
          method: "POST",
          url: "{{baseUrl}}/api/integrations/v1/webhook-endpoints/{{webhookEndpointId}}/test",
          tests: [statusTest(200)],
          description: "Directly tests receiver connectivity and response.",
        }),
      ],
    },
    {
      name: "05 - Delivery Recovery",
      item: [
        jsonRequest({
          name: "List Failed Deliveries",
          url: "{{baseUrl}}/api/integrations/v1/webhook-deliveries?page=1&limit=25&status=FAILED",
          tests: [
            saveValueTest(200, [
              "const delivery = json.data.data[0];",
              "if (delivery) pm.environment.set('webhookDeliveryId', delivery.id);",
            ]),
          ],
        }),
        jsonRequest({
          name: "Retry Delivery",
          method: "POST",
          url: "{{baseUrl}}/api/integrations/v1/webhook-deliveries/{{webhookDeliveryId}}/retry",
          tests: [statusTest(200)],
        }),
      ],
    },
  ],
};

const environment = {
  id: crypto.randomUUID(),
  name: "Partner CRM Integration - Local",
  values: [
    { key: "baseUrl", value: "http://localhost:3000", enabled: true },
    { key: "clientId", value: "", enabled: true },
    { key: "apiKey", value: "", type: "secret", enabled: true },
    { key: "limit", value: "100", enabled: true },
    { key: "entities", value: "lead,booking,payment,refund", enabled: true },
    { key: "cursor", value: "", enabled: true },
    { key: "bookingId", value: "", enabled: true },
    {
      key: "webhookUrl",
      value: "http://localhost:4000/api/webhooks/get2vacations",
      enabled: true,
    },
    { key: "webhookEndpointId", value: "", enabled: true },
    { key: "webhookDeliveryId", value: "", enabled: true },
    { key: "webhookSigningSecret", value: "", type: "secret", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "Codex",
};

fs.writeFileSync(
  path.join(outputDir, "Partner-CRM-Integration.postman_collection.json"),
  `${JSON.stringify(collection, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outputDir, "Partner-CRM-Integration.postman_environment.json"),
  `${JSON.stringify(environment, null, 2)}\n`,
);

console.log("Partner Postman assets generated.");
