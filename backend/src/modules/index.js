import { createAuthModule } from "./auth/index.js";
import { createRbacModule } from "./rbac/index.js";
import { createUsersModule } from "./users/index.js";
import { createLeadsModule } from "./leads/index.js";
import { createQuotationsModule } from "./quotations/index.js";
import { createBookingsModule } from "./bookings/index.js";
import { createPaymentsModule } from "./payments/index.js";
import { createRefundsModule } from "./refunds/index.js";
import { createVisaModule } from "./visa/index.js";
import { createCampaignsModule } from "./campaigns/index.js";
import { createCustomersModule } from "./customers/index.js";
import { createComplaintsModule } from "./complaints/index.js";
import { createReportsModule } from "./reports/index.js";
import { createSettingsModule } from "./settings/index.js";
import { createWebhooksModule } from "./webhooks/index.js";
import { createNotificationsModule } from "./notifications/index.js";
import { createDashboardModule } from "./dashboard/index.js";
import { createMetaWebhookModule } from "./metaWebhook/index.js";

function registerModules(app, dependencies) {
  const mountedModules = {};

  const authModule = createAuthModule({ dependencies });
  mountedModules.auth = authModule;
  app.use("/api/auth", authModule.router);

  const dependenciesWithAuth = {
    ...dependencies,
    middlewares: {
      ...dependencies.middlewares,
      requireAuth: authModule.middleware.requireAuth,
      optionalAuth: authModule.middleware.optionalAuth,
    },
  };

  const rbacModule = createRbacModule({ dependencies: dependenciesWithAuth });
  mountedModules.rbac = rbacModule;
  app.use("/api/rbac", rbacModule.router);

  const featureDependencies = {
    ...dependenciesWithAuth,
    middlewares: {
      ...dependenciesWithAuth.middlewares,
      authorize: rbacModule.middleware.authorize,
    },
  };

  const featureFactories = [
    ["users", createUsersModule],
    ["leads", createLeadsModule],
    ["quotations", createQuotationsModule],
    ["bookings", createBookingsModule],
    ["payments", createPaymentsModule],
    ["refunds", createRefundsModule],
    ["visa", createVisaModule],
    ["campaigns", createCampaignsModule],
    ["customers", createCustomersModule],
    ["complaints", createComplaintsModule],
    ["reports", createReportsModule],
    ["settings", createSettingsModule],
    ["dashboard", createDashboardModule],
  ];

  featureFactories.forEach(([name, factory]) => {
    const moduleInstance = factory({ dependencies: featureDependencies });
    mountedModules[name] = moduleInstance;
    app.use(`/api/${name}`, moduleInstance.router);
  });

  const webhooksModule = createWebhooksModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
  });
  mountedModules.webhooks = webhooksModule;
  app.use("/api/webhooks", webhooksModule.router);

  const metaWebhookModule = createMetaWebhookModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
  });
  mountedModules.metaWebhook = metaWebhookModule;
  app.use("/webhook", metaWebhookModule.router);

  const notificationsModule = createNotificationsModule({
    dependencies: featureDependencies,
  });
  mountedModules.notifications = notificationsModule;
  app.use("/api/notifications", notificationsModule.router);

  return mountedModules;
}

export {
  registerModules,
  createAuthModule,
  createRbacModule,
  createUsersModule,
  createLeadsModule,
  createQuotationsModule,
  createBookingsModule,
  createPaymentsModule,
  createRefundsModule,
  createVisaModule,
  createCampaignsModule,
  createCustomersModule,
  createComplaintsModule,
  createReportsModule,
  createSettingsModule,
  createWebhooksModule,
  createMetaWebhookModule,
  createNotificationsModule,
  createDashboardModule,
};
