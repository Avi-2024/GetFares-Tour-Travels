import { createLandingModule } from "./landing/index.js";
import { createDestinationsModule } from "./destinations/index.js";
import { createCmsPackagesModule } from "./packages/index.js";
import { createVisaModule } from "./visa/index.js";
import { createExperienceModule } from "./experience/index.js";
import { createCmsMediaModule } from "./media/index.js";

function createCmsModules({ db }) {
  const landing = createLandingModule({ db });
  const destinations = createDestinationsModule({ db });
  const packages = createCmsPackagesModule({ db });
  const visa = createVisaModule({ db });
  const experience = createExperienceModule({ db });
  const media = createCmsMediaModule({ db });

  return {
    landing,
    destinations,
    packages,
    visa,
    experience,
    media,
  };
}

function registerModules(app, dependencies) {
  const mountedModules = {};

  const landing = createLandingModule({ db: dependencies.db });
  mountedModules.landing = landing;
  app.use("/cms", landing.routes);

  const destinations = createDestinationsModule({ db: dependencies.db });
  mountedModules.destinations = destinations;
  app.use("/cms/destinations", destinations.routes);

  const packages = createCmsPackagesModule({ db: dependencies.db });
  mountedModules.packages = packages;
  app.use("/cms/packages", packages.routes);

  const visa = createVisaModule({ db: dependencies.db });
  mountedModules.visa = visa;
  app.use("/cms/visa", visa.routes);

  const experience = createExperienceModule({ db: dependencies.db });
  mountedModules.experience = experience;
  app.use("/cms/experience", experience.routes);

  const media = createCmsMediaModule({ db: dependencies.db });
  mountedModules.media = media;
  app.use("/cms/media", media.routes);

  return mountedModules;
}

export { createCmsModules, registerModules };
