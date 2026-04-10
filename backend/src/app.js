import express from "express";
import path from "node:path";
import cors from "cors";
import helmet from "helmet";
import { createContainer } from "./container.js";
import { registerModules } from "./modules/index.js";
import {
  requestContext,
  createRequestLoggingMiddleware,
  notFound,
  errorHandler,
} from "../crm/core/middlewares/index.js";
import { createRequestMetricsMiddleware } from "../crm/core/observability/index.js";

function createApp(overrides = {}) {
  const app = express();
  const container = createContainer(overrides);
  const runtime = {
    startedAt: new Date(),
    isShuttingDown: false,
  };
  app.locals.logger = container.logger;

  app.use(helmet());
  const corsOptions = {
    origin: container.config.app.corsOrigin,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(
    express.json({
      limit: "5mb",
      verify: (req, _res, buf) => {
        if (buf && buf.length) {
          req.rawBody = buf.toString("utf8");
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use(requestContext);
  app.use(createRequestLoggingMiddleware({ logger: container.logger }));
  app.use(
    createRequestMetricsMiddleware({ metricsStore: container.metricsStore }),
  );

  const modules = registerModules(app, container, overrides.modules || {});

  app.get("/health", (req, res) => {
    const uptimeSeconds = Math.floor(
      (Date.now() - runtime.startedAt.getTime()) / 1000,
    );
    res.status(200).json({
      service: container.config.app.name,
      version: container.config.app.version,
      env: container.config.env,
      status: "ok",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      Owener: "You are.",
    });
  });

  app.get("/health/live", (req, res) => {
    res.status(200).json({
      service: container.config.app.name,
      version: container.config.app.version,
      status: "alive",
      uptimeSeconds: Math.floor(
        (Date.now() - runtime.startedAt.getTime()) / 1000,
      ),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", async (req, res) => {
    if (runtime.isShuttingDown) {
      return res.status(503).json({
        service: container.config.app.name,
        version: container.config.app.version,
        status: "shutting_down",
        ready: false,
        checks: {
          app: { ok: true },
          db: { ok: false, reason: "Application is draining for shutdown" },
        },
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const dbCheck =
        typeof container.db?.healthCheck === "function" ?
          await container.db.healthCheck({
            timeoutMs: container.config.health.dbTimeoutMs,
          })
        : {
            ok: true,
            adapter: "unknown",
            checkedAt: new Date().toISOString(),
          };

      return res.status(200).json({
        service: container.config.app.name,
        version: container.config.app.version,
        status: "ready",
        ready: true,
        checks: {
          app: { ok: true },
          db: dbCheck,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      req.logger?.error(
        {
          module: "health",
          fileName: "app.js",
          functionName: "health.ready",
          requestId: req.context?.requestId,
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: 503,
          stack: error?.stack,
        },
        "Database failure",
      );
      return res.status(503).json({
        service: container.config.app.name,
        version: container.config.app.version,
        status: "not_ready",
        ready: false,
        checks: {
          app: { ok: true },
          db: { ok: false, reason: error.message },
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (container.config.metrics.enabled) {
    app.get("/metrics", (req, res) => {
      const expectedToken = container.config.metrics.token;
      const providedToken = req.headers["x-metrics-token"];

      if (expectedToken && providedToken !== expectedToken) {
        return res.status(401).json({
          error: {
            message: "Unauthorized metrics access",
            code: "UNAUTHORIZED_METRICS",
            requestId: req.context?.requestId,
          },
        });
      }

      res.setHeader("content-type", "text/plain; version=0.0.4; charset=utf-8");
      return res.status(200).send(container.metricsStore.renderPrometheus());
    });

    app.get("/metrics/json", (req, res) => {
      const expectedToken = container.config.metrics.token;
      const providedToken = req.headers["x-metrics-token"];

      if (expectedToken && providedToken !== expectedToken) {
        return res.status(401).json({
          error: {
            message: "Unauthorized metrics access",
            code: "UNAUTHORIZED_METRICS",
            requestId: req.context?.requestId,
          },
        });
      }

      return res.status(200).json({
        data: container.metricsStore.snapshot(),
      });
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return { app, container, modules, runtime };
}

export { createApp };
