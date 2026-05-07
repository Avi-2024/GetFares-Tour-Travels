import { CmsApplication } from "./CmsApplication.js";

async function main() {
  const app = CmsApplication.create();

  try {
    await app.start();

    process.on("SIGTERM", async () => {
      app.logger.info("SIGTERM received");
      await app.shutdown();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      app.logger.info("SIGINT received");
      await app.shutdown();
      process.exit(0);
    });
  } catch (error) {
    app.logger?.error(
      {
        module: "cms",
        fileName: "index.js",
        functionName: "main",
        stack: error?.stack,
      },
      "Unhandled exception",
    );
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CmsApplication };
