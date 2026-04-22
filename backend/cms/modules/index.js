import { createLandingModule } from "./landing/index.js";
import { createDestinationsModule } from "./destinations/index.js";
import { createCmsPackagesModule } from "./packages/index.js";
import { createVisaModule } from "./visa/index.js";
import { createExperienceModule } from "./experience/index.js";
import { createCmsMediaModule } from "./media/index.js";
import { createPublicCmsModule } from "./public/index.js";
import {
  CMS_ROLE_ALIASES,
  CMS_ROLE_NAME,
  createCmsAccessMiddleware,
} from "../core/middlewares/cmsAccess.middleware.js";
import { createMemoryUpload } from "../../crm/core/uploads/index.js";

function createCmsModules({ db, storage, logger, upload }) {
  const uploadMiddleware = upload || createMemoryUpload({ maxFileSizeMb: 200 });

  const landing = createLandingModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
  const destinations = createDestinationsModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
  const packages = createCmsPackagesModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
  const visa = createVisaModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
  const experience = createExperienceModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
  const media = createCmsMediaModule({
    db,
    storage,
    upload: uploadMiddleware,
    logger,
  });
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
  const upload =
    options.upload ||
    createMemoryUpload({
      maxFileSizeMb: dependencies.config?.uploads?.maxFileSizeMb || 200,
    });
  const requireAuth =
    options.requireAuth || dependencies.middlewares?.requireAuth;
  const requireCmsAccess =
    options.requireCmsAccess ||
    createCmsAccessMiddleware({
      db: dependencies.db,
      requiredRole: options.requiredRole || CMS_ROLE_NAME,
      allowedRoles: options.allowedRoles || CMS_ROLE_ALIASES,
    });

  const cmsGuards =
    typeof requireAuth === "function" ?
      [requireAuth, requireCmsAccess]
    : [requireCmsAccess];

  const landing = createLandingModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
  mountedModules.landing = landing;

  const destinations = createDestinationsModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
  mountedModules.destinations = destinations;

  const packages = createCmsPackagesModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
  mountedModules.packages = packages;

  const visa = createVisaModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
  mountedModules.visa = visa;

  const experience = createExperienceModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
  mountedModules.experience = experience;

  const media = createCmsMediaModule({
    db: dependencies.db,
    storage: dependencies.storage,
    upload,
    logger: dependencies.logger,
  });
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
