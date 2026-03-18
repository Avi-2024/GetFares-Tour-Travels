import pino from "pino";
import { config } from "../config/index.js";

const logger = pino({
  level: config.logger.level,
  redact: {
    paths: ["req.headers.authorization", "password", "*.password"],
    censor: "[REDACTED]",
  },
});

export { logger };
