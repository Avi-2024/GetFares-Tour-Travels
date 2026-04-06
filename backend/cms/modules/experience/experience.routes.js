import express from "express";

function createExperienceRoutes({ controller, upload }) {
  const router = express.Router();

  router
    .route("/featured-picks")
    .get(controller.listFeaturedPicks)
    .post(upload.single("bannerImage"), controller.createFeaturedPick);

  router
    .route("/featured-picks/:id")
    .get(controller.getFeaturedPickById)
    .put(upload.single("bannerImage"), controller.updateFeaturedPick)
    .delete(controller.deleteFeaturedPick);

  router
    .route("/season-cards")
    .get(controller.listSeasonCards)
    .post(upload.single("bannerImage"), controller.createSeasonCard);

  router
    .route("/season-cards/:id")
    .get(controller.getSeasonCardById)
    .put(upload.single("bannerImage"), controller.updateSeasonCard)
    .delete(controller.deleteSeasonCard);

  router.route("/hero-sections").get(controller.listHeroSections);
  router
    .route("/hero-sections/:sectionKey")
    .put(upload.single("bannerImage"), controller.upsertHeroSection);

  return router;
}

export { createExperienceRoutes };
