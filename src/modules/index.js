const { createAuthModule } = require('./auth');
const { createRbacModule } = require('./rbac');
const { createUsersModule } = require('./users');
const { createLeadsModule } = require('./leads');
const { createQuotationsModule } = require('./quotations');
const { createBookingsModule } = require('./bookings');
const { createPaymentsModule } = require('./payments');
const { createRefundsModule } = require('./refunds');
const { createVisaModule } = require('./visa');
const { createCampaignsModule } = require('./campaigns');
const { createCustomersModule } = require('./customers');
const { createComplaintsModule } = require('./complaints');
const { createReportsModule } = require('./reports');
const { createWebhooksModule } = require('./webhooks');
const { createNotificationsModule } = require('./notifications');

function registerModules(app, dependencies) {
  const mountedModules = {};

  const authModule = createAuthModule({ dependencies });
  mountedModules.auth = authModule;
  app.use('/api/auth', authModule.router);

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
  app.use('/api/rbac', rbacModule.router);

  const featureDependencies = {
    ...dependenciesWithAuth,
    middlewares: {
      ...dependenciesWithAuth.middlewares,
      authorize: rbacModule.middleware.authorize,
    },
  };

  const featureFactories = [
    ['users', createUsersModule],
    ['leads', createLeadsModule],
    ['quotations', createQuotationsModule],
    ['bookings', createBookingsModule],
    ['payments', createPaymentsModule],
    ['refunds', createRefundsModule],
    ['visa', createVisaModule],
    ['campaigns', createCampaignsModule],
    ['customers', createCustomersModule],
    ['complaints', createComplaintsModule],
    ['reports', createReportsModule],
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
  app.use('/api/webhooks', webhooksModule.router);

  const notificationsModule = createNotificationsModule({
    dependencies: featureDependencies,
  });
  mountedModules.notifications = notificationsModule;
  app.use('/api/notifications', notificationsModule.router);

  return mountedModules;
}

module.exports = {
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
  createWebhooksModule,
  createNotificationsModule,
};
