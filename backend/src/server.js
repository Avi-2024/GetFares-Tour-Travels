import http from "node:http";
// import dns from "node:dns";
import { createApp } from "./app.js";
import { createSocketServer } from "../crm/core/realtime/index.js";
import { createAutomationRuntime } from "../crm/core/automation/index.js";

// dns.setServers(["1.1.1.1"]);

const { app, container, modules, runtime } = createApp();
const httpServer = http.createServer(app);
const automationRuntime = createAutomationRuntime({
  container,
  modules: modules?.crm || modules,
});

const socketServer = createSocketServer({
  httpServer,
  logger: container.logger,
  authConfig: container.config.auth,
  corsOrigin: container.config.app.corsOrigin,
});

container.eventPublisher.attachSocketServer(socketServer);

httpServer.listen(container.config.app.port, () => {
  container.logger.info(
    {
      port: container.config.app.port,
      env: container.config.env,
      version: container.config.app.version,
    },
    `${container.config.app.name} is listening`,
  );

  try {
    automationRuntime.start();
  } catch (error) {
    container.logger.error(
      { err: error, module: "automation" },
      "Failed to start automation runtime",
    );
  }
});

let shuttingDown = false;

async function closeDependencies({ skipLogger = false } = {}) {
  if (typeof automationRuntime?.stop === "function") automationRuntime.stop();
  if (typeof socketServer?.close === "function") socketServer.close();
  if (typeof container.db?.close === "function") await container.db.close();
  if (!skipLogger && typeof container.logger?.close === "function") {
    await container.logger.close();
  }
}

function initiateShutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;
  runtime.isShuttingDown = true;

  container.logger.warn(
    { signal, shutdownTimeoutMs: container.config.app.shutdownTimeoutMs },
    "Graceful shutdown started",
  );

  const forceShutdownTimer = setTimeout(() => {
    container.logger.error(
      "Graceful shutdown timed out. Forcing process exit.",
    );
    process.exit(1);
  }, container.config.app.shutdownTimeoutMs);

  forceShutdownTimer.unref?.();

  httpServer.close(async (serverCloseError) => {
    if (serverCloseError) {
      container.logger.error(
        { err: serverCloseError },
        "HTTP server close failed",
      );
    }

    try {
      await closeDependencies({ skipLogger: true });
      container.logger.info("Graceful shutdown completed");
    } catch (dependencyError) {
      container.logger.error(
        { err: dependencyError },
        "Error while closing dependencies",
      );
    } finally {
      if (typeof container.logger?.close === "function") {
        await container.logger.close();
      }
      clearTimeout(forceShutdownTimer);
      process.exit(serverCloseError ? 1 : 0);
    }
  });
}

process.on("SIGTERM", () => initiateShutdown("SIGTERM"));
process.on("SIGINT", () => initiateShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  container.logger.error(
    {
      module: "server",
      fileName: "server.js",
      functionName: "unhandledRejection",
      metadata: {
        reason: reason instanceof Error ? reason.message : String(reason),
      },
      stack: reason instanceof Error ? reason.stack : undefined,
    },
    "Unhandled exception",
  );
  initiateShutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  container.logger.error(
    {
      module: "server",
      fileName: "server.js",
      functionName: "uncaughtException",
      stack: error?.stack,
      metadata: {
        message: error?.message,
      },
    },
    "Unhandled exception",
  );
  initiateShutdown("uncaughtException");
});
