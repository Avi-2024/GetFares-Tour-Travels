import { DestinationsSchema } from './destinations.schema.js';
import { createDestinationsRepository } from './destinations.repository.js';
import { createDestinationsService } from './destinations.service.js';
import { createDestinationsController } from './destinations.controller.js';
import { createDestinationsRoutes } from './destinations.routes.js';

function createDestinationsModule({ db }) {
  const repository = createDestinationsRepository({
    db,
    schema: DestinationsSchema,
  });
  const service = createDestinationsService({ repository });
  const controller = createDestinationsController({ service });
  const routes = createDestinationsRoutes({ controller });

  return {
    repository,
    service,
    controller,
    routes,
  };
}

export { createDestinationsModule };
