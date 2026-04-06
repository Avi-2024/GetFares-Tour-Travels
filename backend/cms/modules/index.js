import { createLandingModule } from "./landing/index.js";
import { createDestinationsModule } from "./destinations/index.js";
import { createCmsPackagesModule } from "./packages/index.js";
import { createVisaModule } from "./visa/index.js";
import { createExperienceModule } from "./experience/index.js";
import { createCmsMediaModule } from "./media/index.js";
import { createPublicCmsModule } from "./public/index.js";
import { createCmsAccessMiddleware } from "../core/middlewares/cmsAccess.middleware.js";

function createCmsModules({ db }) {
  const landing = createLandingModule({ db });
  const destinations = createDestinationsModule({ db });
  const packages = createCmsPackagesModule({ db });
  const visa = createVisaModule({ db });
  const experience = createExperienceModule({ db });
  const media = createCmsMediaModule({ db });
  const publicCms = createPublicCmsModule({
    landingService: landing.service,
    destinationsService: destinations.service,
    packagesService: packages.service,
    visaService: visa.service,
    experienceService: experience.service,
  });

  return {
    landing,
    destinations,
    packages,
    visa,
    experience,
    media,
    public: publicCms,
  };
}

function registerModules(app, dependencies, options = {}) {
  const mountedModules = {};
  const requireAuth =
    options.requireAuth || dependencies.middlewares?.requireAuth;
  const requireCmsAccess =
    options.requireCmsAccess ||
    createCmsAccessMiddleware({
      db: dependencies.db,
      requiredRole: options.requiredRole || "CMS_ACCESS",
    });

  const cmsGuards =
    typeof requireAuth === "function" ?
      [requireAuth, requireCmsAccess]
    : [requireCmsAccess];

  const landing = createLandingModule({ db: dependencies.db });
  mountedModules.landing = landing;

  const destinations = createDestinationsModule({ db: dependencies.db });
  mountedModules.destinations = destinations;

  const packages = createCmsPackagesModule({ db: dependencies.db });
  mountedModules.packages = packages;

  const visa = createVisaModule({ db: dependencies.db });
  mountedModules.visa = visa;

  const experience = createExperienceModule({ db: dependencies.db });
  mountedModules.experience = experience;

  const media = createCmsMediaModule({ db: dependencies.db });
  mountedModules.media = media;

  const publicCms = createPublicCmsModule({
    landingService: landing.service,
    destinationsService: destinations.service,
    packagesService: packages.service,
    visaService: visa.service,
    experienceService: experience.service,
  });
  mountedModules.public = publicCms;

  app.use("/public/cms", publicCms.routes);
  app.use("/api/public/cms", publicCms.routes);

  app.use("/cms/destinations", ...cmsGuards, destinations.routes);
  app.use("/cms/packages", ...cmsGuards, packages.routes);
  app.use("/cms/visa", ...cmsGuards, visa.routes);
  app.use("/cms/experience", ...cmsGuards, experience.routes);
  app.use("/cms/media", ...cmsGuards, media.routes);

  app.use("/cms", ...cmsGuards, landing.routes);

  return mountedModules;
}

export { createCmsModules, registerModules };
