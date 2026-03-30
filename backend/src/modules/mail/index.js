import { createMailController } from "./mail.controller.js";
import { createMailRoutes } from "./mail.routes.js";

function createMailModule(container) {
  const controller = createMailController({
    mailService: container.services.mail,
  });

  const routes = createMailRoutes({ controller });

  return { routes };
}

export { createMailModule };
