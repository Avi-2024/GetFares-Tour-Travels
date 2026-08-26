// Creates HTTP handlers for Breezer integration test endpoints.
function createBreezerIntegrationController({ service }) {
  return Object.freeze({
    async previewBookingPayload(req, res) {
      const payload = await service.previewBookingCreatedPayload(
        req.validated.params.id,
      );
      res
        .status(200)
        .type("application/json")
        .send(`${JSON.stringify(payload, null, 2)}\n`);
    },

    async testBooking(req, res) {
      const result = await service.sendBookingCreated(req.validated.params.id, {
        trigger: "manual-test",
      });
      res.status(200).json({ data: result });
    },

    async previewVisaPayload(req, res) {
      const payload = await service.previewVisaCreatedPayload(
        req.validated.params.id,
      );
      res
        .status(200)
        .type("application/json")
        .send(`${JSON.stringify(payload, null, 2)}\n`);
    },

    async testVisa(req, res) {
      const result = await service.sendVisaCreatedForBooking(
        req.validated.params.id,
        { trigger: "manual-test" },
      );
      res.status(200).json({ data: result });
    },

    async previewPaymentPayload(req, res) {
      const payload = await service.previewPaymentPayload(
        req.validated.params.id,
        req.query?.eventType || "payment.created",
      );
      res
        .status(200)
        .type("application/json")
        .send(`${JSON.stringify(payload, null, 2)}\n`);
    },

    async testPayment(req, res) {
      const eventType = req.query?.eventType === "payment.updated"
        ? "payment.updated"
        : "payment.created";
      const result = eventType === "payment.updated"
        ? await service.sendPaymentUpdated(req.validated.params.id, {
            trigger: "manual-test",
          })
        : await service.sendPaymentCreated(req.validated.params.id, {
            trigger: "manual-test",
          });
      res.status(200).json({ data: result });
    },

    async previewRefundPayload(req, res) {
      const payload = await service.previewRefundPayload(
        req.validated.params.id,
        req.query?.eventType || "refund.created",
      );
      res
        .status(200)
        .type("application/json")
        .send(`${JSON.stringify(payload, null, 2)}\n`);
    },

    async testRefund(req, res) {
      const eventType = req.query?.eventType === "refund.updated"
        ? "refund.updated"
        : "refund.created";
      const result = eventType === "refund.updated"
        ? await service.sendRefundUpdated(req.validated.params.id, {
            trigger: "manual-test",
          })
        : await service.sendRefundCreated(req.validated.params.id, {
            trigger: "manual-test",
          });
      res.status(200).json({ data: result });
    },
  });
}

export { createBreezerIntegrationController };
