import { CmsApplication } from './CmsApplication.js';

/**
 * Main entry point
 * Creates and starts CMS application
 */
async function main() {
  const app = CmsApplication.create();

  try {
    await app.start();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      app.logger.info('SIGTERM received');
      await app.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      app.logger.info('SIGINT received');
      await app.shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CmsApplication };
