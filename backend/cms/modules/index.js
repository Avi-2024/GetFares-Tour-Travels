import { createLandingModule } from "./landing/index.js";
import { createDestinationsModule } from "./destinations/index.js";
import { createCmsPackagesModule } from "./packages/index.js";
import { createVisaModule } from "./visa/index.js";

function createCmsModules({ db }) {
  const landing = createLandingModule({ db });
  const destinations = createDestinationsModule({ db });
  const packages = createCmsPackagesModule({ db });
  const visa = createVisaModule({ db });

  return {
    landing,
    destinations,
    packages,
    visa,
  };
}

export { createCmsModules };
