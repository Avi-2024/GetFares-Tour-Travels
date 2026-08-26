import {
  mapBookingCreatedPayload,
} from "../breezerIntegration/breezerIntegration.mapper.js";

function createBookingsController({ service }) {
  return Object.freeze({
    async list(req, res) {
      const result = await service.list(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result.data, meta: result.meta });
    },

    async paymentPickerOptions(req, res) {
      const result = await service.paymentPickerOptions(
        req.validated?.query || req.query,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async stats(req, res) {
      const result = await service.stats(
        req.validated?.query || req.query || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async runTravelReminders(req, res) {
      const result = await service.runTravelReminders(
        req.validated?.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async processDeadlineAlerts(req, res) {
      const result = await service.processDeadlineAlerts(
        req.validated?.body || {},
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async getById(req, res) {
      const result = await service.getById(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async create(req, res) {
      const result = await service.create(req.validated.body, req.context);
      res.status(201).json({
        data: {
          ...result,
          booking: result,
          breezerPayload: mapBookingCreatedPayload(result),
        },
      });
    },

    async update(req, res) {
      const result = await service.update(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async transitionStatus(req, res) {
      const result = await service.transitionStatus(
        req.validated.params.id,
        req.validated.body,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async listStatusHistory(req, res) {
      const result = await service.listStatusHistory(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async generateInvoice(req, res) {
      const result = await service.generateInvoice(
        req.validated.params.id,
        req.validated.body || {},
        req.context,
      );
      res.status(201).json({ data: result });
    },

    async listInvoices(req, res) {
      const result = await service.listInvoices(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },

    async approve(req, res) {
      const result = await service.approve(
        req.validated.params.id,
        req.context,
      );
      res.status(200).json({ data: result });
    },
  });
}

export { createBookingsController };
