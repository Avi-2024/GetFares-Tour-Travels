import { registerModules as registerCrmModules } from "../../crm/modules/index.js";
import { registerModules as registerCmsModules } from "../../cms/modules/index.js";

function registerModules(app, dependencies, options = {}) {
  const crmModules = registerCrmModules(app, dependencies);
  const cmsModules = registerCmsModules(app, dependencies, options.cms);

  return {
    ...crmModules,
    crm: crmModules,
    cms: cmsModules,
  };
}

export { registerModules, registerCrmModules, registerCmsModules };
