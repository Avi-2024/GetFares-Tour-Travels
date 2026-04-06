import express from "express";

function createExperienceRoutes({ controller }) {
  const router = express.Router();

  router
    .route("/featured-picks")
    .get(controller.listFeaturedPicks)
    .post(controller.createFeaturedPick);

  router
    .route("/featured-picks/:id")
    .get(controller.getFeaturedPickById)
    .put(controller.updateFeaturedPick)
    .delete(controller.deleteFeaturedPick);

  router
    .route("/season-cards")
    .get(controller.listSeasonCards)
    .post(controller.createSeasonCard);

  router
    .route("/season-cards/:id")
    .get(controller.getSeasonCardById)
    .put(controller.updateSeasonCard)
    .delete(controller.deleteSeasonCard);

  router.route("/hero-sections").get(controller.listHeroSections);
  router.route("/hero-sections/:sectionKey").put(controller.upsertHeroSection);

  return router;
}

export { createExperienceRoutes };
