import { CurrencyService } from './currency.service.js';
import { CurrencyController } from './currency.controller.js';
import { createCurrencyRoutes } from './currency.routes.js';

function registerCurrencyModule(app, dependencies) {
  const { db, logger, config, middlewares } = dependencies;

  console.log('🔧 Registering Currency Module...');
  console.log('Config has currency?', !!config.currency);
  console.log('API Key present?', !!config.currency?.apiKey);

  const currencyService = new CurrencyService({ db, logger, config });
  const currencyController = new CurrencyController({ currencyService, logger });
  const currencyRoutes = createCurrencyRoutes({ controller: currencyController, middlewares });

  app.use('/api/currency', currencyRoutes);
  
  console.log('✅ Currency Module registered at /api/currency');

  return { service: currencyService, controller: currencyController };
}

export { registerCurrencyModule };
