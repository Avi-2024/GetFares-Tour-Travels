// Creates HTTP handlers for Breezer integration test endpoints.
function createBreezerIntegrationController({ service }) {
  return Object.freeze({
    async testBooking(req, res) {
      const result = await service.sendBookingCreated(req.validated.params.id, {
        trigger: "manual-test",
      });
      res.status(200).json({ data: result });
    },
  });
}

export { createBreezerIntegrationController };
