import { asyncHandler } from "../../core/utils/index.js";

function createCountriesController({ service }) {
  return Object.freeze({
    list: asyncHandler(async (req, res) => {
      const filters = {};
      if (req.query.isActive !== undefined) {
        filters.is_active = req.query.isActive === 'true';
      }
      const countries = await service.list(filters);
      res.json({ data: countries });
    }),

    getById: asyncHandler(async (req, res) => {
      const country = await service.getById(req.params.id);
      res.json({ data: country });
    }),

    getByCode: asyncHandler(async (req, res) => {
      const country = await service.getByCode(req.params.code);
      res.json({ data: country });
    }),

    create: asyncHandler(async (req, res) => {
      const country = await service.create(req.body);
      res.status(201).json({ data: country });
    }),

    update: asyncHandler(async (req, res) => {
      const country = await service.update(req.params.id, req.body);
      res.json({ data: country });
    }),

    delete: asyncHandler(async (req, res) => {
      await service.delete(req.params.id);
      res.json({ message: "Country deleted successfully" });
    }),
  });
}

export { createCountriesController };
