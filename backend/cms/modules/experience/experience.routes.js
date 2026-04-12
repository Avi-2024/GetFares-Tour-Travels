import express from "express";

function createExperienceRoutes({ controller, upload }) {
  const router = express.Router();

  router
    .route("/featured-picks")
    .get(controller.listFeaturedPicks)
    .post(upload.any(), controller.createFeaturedPick);
  router
    .route("/creative-toolkit")
    .get(controller.listFeaturedPicks)
    .post(upload.any(), controller.createFeaturedPick);
  router.route("/featured-picks/deleted").get(controller.listDeletedFeaturedPicks);
  router.route("/creative-toolkit/deleted").get(controller.listDeletedFeaturedPicks);

  router
    .route("/featured-picks/:id/status")
    .patch(controller.updateFeaturedPickStatus);
  router
    .route("/creative-toolkit/:id/status")
    .patch(controller.updateFeaturedPickStatus);
  router
    .route("/featured-picks/:id")
    .get(controller.getFeaturedPickById)
    .put(upload.any(), controller.updateFeaturedPick)
    .delete(controller.deleteFeaturedPick);
  router
    .route("/creative-toolkit/:id")
    .get(controller.getFeaturedPickById)
    .put(upload.any(), controller.updateFeaturedPick)
    .delete(controller.deleteFeaturedPick);
  router.route("/featured-picks/:id/hard-delete").delete(controller.hardDeleteFeaturedPick);
  router.route("/creative-toolkit/:id/hard-delete").delete(controller.hardDeleteFeaturedPick);

  router
    .route("/season-cards")
    .get(controller.listSeasonCards)
    .post(upload.any(), controller.createSeasonCard);
  router.route("/season-cards/deleted").get(controller.listDeletedSeasonCards);

  router
    .route("/season-cards/:id/status")
    .patch(controller.updateSeasonCardStatus);
  router
    .route("/season-cards/:id")
    .get(controller.getSeasonCardById)
    .put(upload.any(), controller.updateSeasonCard)
    .delete(controller.deleteSeasonCard);
  router.route("/season-cards/:id/hard-delete").delete(controller.hardDeleteSeasonCard);

  router.route("/hero-sections").get(controller.listHeroSections);
  router
    .route("/hero-sections/:sectionKey")
    .put(upload.any(), controller.upsertHeroSection);

  return router;
}

export { createExperienceRoutes };
