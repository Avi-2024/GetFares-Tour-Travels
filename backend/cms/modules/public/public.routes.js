import express from "express";

function createPublicCmsRoutes({ controller }) {
  const router = express.Router();

  router.route("/home").get(controller.home);

  router.route("/landing-places").get(controller.listLandingPlaces);

  router.route("/destinations").get(controller.listDestinations);
  router.route("/destinations/:slug").get(controller.getDestinationBySlug);
  router.route("/destinations/:slug/media").get(controller.getDestinationMediaBySlug);
  router
    .route("/destinations/:slug/season-cards")
    .get(controller.getDestinationSeasonCardsBySlug);
  router.route("/destinations/:slug/packages").get(controller.getDestinationPackagesBySlug);

  router.route("/packages/published").get(controller.listPublishedPackages);
  router.route("/packages/main").get(controller.listMainPackages);
  router.route("/packages/main/:mainPackageId/sub").get(controller.listSubPackages);

  router.route("/visa-destinations").get(controller.listVisaDestinations);
  router.route("/visa-destinations/:slug").get(controller.getVisaDestinationBySlug);
  router.route("/visa-destinations/:slug/details").get(controller.getVisaDetailsBySlug);

  router.route("/featured-picks").get(controller.listFeaturedPicks);
  router.route("/creative-toolkit").get(controller.listFeaturedPicks);
  router.route("/season-cards").get(controller.listSeasonCards);
  router.route("/hero-sections").get(controller.listHeroSections);

  return router;
}

export { createPublicCmsRoutes };
