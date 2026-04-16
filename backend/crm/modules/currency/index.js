import { CurrencyService } from "./currency.service.js";
import { CurrencyController } from "./currency.controller.js";
import { createCurrencyRoutes } from "./currency.routes.js";

function registerCurrencyModule(app, dependencies) {
  const { db, logger, config } = dependencies;

  const currencyService = new CurrencyService({ db, logger, config });
  const currencyController = new CurrencyController({ currencyService, logger });
  const currencyRoutes = createCurrencyRoutes({ controller: currencyController });

  app.use("/api/currency", currencyRoutes);
  logger?.info?.(
    { module: "currency", baseCurrency: currencyService.baseCurrency },
    "Currency module registered",
  );

  return { service: currencyService, controller: currencyController };
}

export { registerCurrencyModule };
