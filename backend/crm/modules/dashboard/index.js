import { createDashboardRoutes } from './dashboard.routes.js';
import { createDashboardController } from './dashboard.controller.js';
import { createDashboardService } from './dashboard.service.js';
import { createDashboardRepository } from './dashboard.repository.js';

function createDashboardModule({ dependencies }) {
  const repository = createDashboardRepository({
    ...dependencies,
    currencyService: dependencies.services?.currency,
  });
  const service = createDashboardService(
    repository,
    dependencies.services?.reports,
  );
  const controller = createDashboardController(service);
  
  // Create routes with controller instance
  const router = createDashboardRoutes(dependencies, controller);
  
  return {
    router,
    controller,
    service,
    repository
  };
}

export { createDashboardModule };
