import { registerModules as registerCrmModules } from "../../crm/modules/index.js";
import { registerModules as registerCmsModules } from "../../cms/modules/index.js";

function registerModules(app, dependencies, options = {}) {
  const crmModules = registerCrmModules(app, dependencies);

  const cmsDependencies = {
    ...dependencies,
    middlewares: {
      ...(dependencies.middlewares || {}),
      requireAuth:
        crmModules?.auth?.middleware?.requireAuth ||
        dependencies.middlewares?.requireAuth,
      optionalAuth:
        crmModules?.auth?.middleware?.optionalAuth ||
        dependencies.middlewares?.optionalAuth,
    },
  };

  const cmsModules = registerCmsModules(app, cmsDependencies, options.cms);

  return {
    ...crmModules,
    crm: crmModules,
    cms: cmsModules,
  };
}

export { registerModules, registerCrmModules, registerCmsModules };
