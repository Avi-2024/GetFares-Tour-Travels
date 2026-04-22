import { AppError } from "../../core/errors/index.js";

function createAuthController({ service }) {
  return Object.freeze({
    async register(req, res) {
      const result = await service.register(req.validated.body);
      res.status(201).json({ data: result });
    },

    async login(req, res) {
      const forwarded = req.headers["x-forwarded-for"];
      const ipAddress = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : req.ip;

      const result = await service.login(req.validated.body, {
        ipAddress,
        deviceInfo: req.headers["user-agent"] || null,
      });
      res.status(200).json({ data: result });
    },

    async me(req, res) {
      const result = await service.getProfile(req.context.user.id);
      res.status(200).json({ data: result });
    },

    async toggleActive(req, res) {
      const active = req.body?.active;
      if (typeof active !== "boolean") {
        throw new AppError(
          400,
          "active must be a boolean value",
          "VALIDATION_ERROR",
        );
      }
      const result = await service.toggleActive(req.context.user.id, active);
      res.status(200).json({ data: result });
    },

    async logout(req, res) {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const forwarded = req.headers["x-forwarded-for"];
      const ipAddress = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === "string"
          ? forwarded.split(",")[0].trim()
          : req.ip;
      
      const result = await service.logout(req.context.user.id, token, {
        ipAddress,
        deviceInfo: req.headers["user-agent"] || null,
      });
      res.status(200).json({ data: result });
    },
  });
}

export { createAuthController };
