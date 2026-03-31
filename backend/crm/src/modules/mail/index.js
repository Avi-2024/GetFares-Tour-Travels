import { createMailController } from "./mail.controller.js";
import { createMailRoutes } from "./mail.routes.js";
import { registerMailSubscribers } from "./mail.subscribers.js";

function createMailModule(container) {
  const controller = createMailController({
    mailService: container.services.mail,
  });

  const routes = createMailRoutes({ controller });
  const subscribers = registerMailSubscribers({
    eventBus: container.eventBus,
    mailService: container.services.mail,
    leadsService: container.services?.leads,
    logger: container.logger,
  });

  return { routes, subscribers };
}

export { createMailModule };
