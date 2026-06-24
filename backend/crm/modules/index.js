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
import { createPushModule } from "./push/index.js";
import { createDashboardModule } from "./dashboard/index.js";
import { createMetaWebhookModule } from "./metaWebhook/index.js";
import { createWhatsappModule } from "./whatsapp/index.js";
import { createWebsiteEnquiriesModule } from "./websiteEnquiries/index.js";
import { createDestinationsModule } from "./destinations/index.js";
import { createPackagesModule } from "./packages/index.js";
import { createSuppliersModule } from "./suppliers/index.js";
import { createCountriesModule } from "./countries/index.js";
import { createMailModule } from "./mail/index.js";
import { createHistoryModule } from "./history/index.js";
import { registerCurrencyModule } from "./currency/index.js";
import { createBreezerIntegrationModule } from "./breezerIntegration/index.js";

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
  app.use("/api/permissions", rbacModule.permissionsRouter);
  app.use("/api/roles", rbacModule.rolesRouter);

  const featureDependencies = {
    ...dependenciesWithAuth,
    services: {
      ...(dependenciesWithAuth.services || {}),
      rbac: rbacModule.service,
    },
    middlewares: {
      ...dependenciesWithAuth.middlewares,
      authorize: rbacModule.middleware.authorize,
    },
  };

  const currencyModule = registerCurrencyModule(app, featureDependencies);
  mountedModules.currency = currencyModule;
  if (currencyModule?.service) {
    featureDependencies.services.currency = currencyModule.service;
  }

  const featureFactories = [
    ["users", createUsersModule],
    ["leads", createLeadsModule],
    ["quotations", createQuotationsModule],
    ["bookings", createBookingsModule],
    ["payments", createPaymentsModule],
    ["refunds", createRefundsModule],
    ["visa", createVisaModule],
    ["campaigns", createCampaignsModule],
    ["destinations", createDestinationsModule],
    ["packages", createPackagesModule],
    ["suppliers", createSuppliersModule],
    ["countries", createCountriesModule],
    ["history", createHistoryModule],
    ["customers", createCustomersModule],
    ["complaints", createComplaintsModule],
    ["reports", createReportsModule],
    ["settings", createSettingsModule],
    ["dashboard", createDashboardModule],
  ];

  featureFactories.forEach(([name, factory]) => {
    let moduleOptions = {
      dependencies: featureDependencies,
      repositories: {
        leads: mountedModules.leads?.repository,
        quotations: mountedModules.quotations?.repository,
        bookings: mountedModules.bookings?.repository,
      },
    };
    
    // Pass leadsRepository to bookings module
    if (name === "bookings" && mountedModules.leads?.repository) {
      moduleOptions.leadsRepository = mountedModules.leads.repository;
    }
    
    const moduleInstance = factory(moduleOptions);
    mountedModules[name] = moduleInstance;
    app.use(`/api/${name}`, moduleInstance.router);
    if (name === "leads" && moduleInstance.leadActivitiesRouter) {
      app.use("/api/lead-activities", moduleInstance.leadActivitiesRouter);
    }
    if (moduleInstance?.service) {
      featureDependencies.services[name] = moduleInstance.service;
    }
  });

  const webhooksModule = createWebhooksModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
  });
  mountedModules.webhooks = webhooksModule;
  app.use("/api/webhooks", webhooksModule.router);

  const websiteEnquiriesModule = createWebsiteEnquiriesModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
  });
  mountedModules.websiteEnquiries = websiteEnquiriesModule;
  app.use("/api/website-enquiries", websiteEnquiriesModule.router);

  const metaWebhookModule = createMetaWebhookModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
  });
  mountedModules.metaWebhook = metaWebhookModule;
  app.use("/webhook", metaWebhookModule.router);
  if (metaWebhookModule.mappingRouter) {
    app.use("/api/meta-lead-mappings", metaWebhookModule.mappingRouter);
  }
  if (metaWebhookModule.pageConfigRouter) {
    app.use("/api/meta-connection", metaWebhookModule.pageConfigRouter);
  }

  const whatsappModule = createWhatsappModule({
    dependencies: featureDependencies,
    leadsService: mountedModules.leads?.service,
    quotationsService: mountedModules.quotations?.service,
    bookingsService: mountedModules.bookings?.service,
    paymentsService: mountedModules.payments?.service,
    refundsService: mountedModules.refunds?.service,
    visaService: mountedModules.visa?.service,
  });
  mountedModules.whatsapp = whatsappModule;
  app.use("/api/whatsapp", whatsappModule.router);
  app.use("/webhook/whatsapp", whatsappModule.webhookRouter);

  const notificationsModule = createNotificationsModule({
    dependencies: featureDependencies,
  });
  mountedModules.notifications = notificationsModule;
  app.use("/api/notifications", notificationsModule.router);

  const pushModule = createPushModule({
    dependencies: featureDependencies,
  });
  mountedModules.push = pushModule;
  app.use("/api/push", pushModule.router);

  const mailModule = createMailModule(featureDependencies);
  mountedModules.mail = mailModule;
  app.use("/api/mail", mailModule.routes);

  const breezerIntegrationModule = createBreezerIntegrationModule({
    dependencies: featureDependencies,
    bookingsService: mountedModules.bookings?.service,
  });
  mountedModules.breezerIntegration = breezerIntegrationModule;
  app.use("/api/breezer-integration", breezerIntegrationModule.router);

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
  createDestinationsModule,
  createPackagesModule,
  createSuppliersModule,
  createCountriesModule,
  createHistoryModule,
  createCustomersModule,
  createComplaintsModule,
  createReportsModule,
  createSettingsModule,
  createWebsiteEnquiriesModule,
  createWebhooksModule,
  createMetaWebhookModule,
  createWhatsappModule,
  createNotificationsModule,
  createPushModule,
  createDashboardModule,
  createBreezerIntegrationModule,
};
