import express from "express";

function createExperienceRoutes({ controller }) {
  const router = express.Router();

  router.get("/featured-picks", controller.listFeaturedPicks);
  router.get("/featured-picks/:id", controller.getFeaturedPickById);
  router.post("/featured-picks", controller.createFeaturedPick);
  router.put("/featured-picks/:id", controller.updateFeaturedPick);
  router.delete("/featured-picks/:id", controller.deleteFeaturedPick);

  router.get("/season-cards", controller.listSeasonCards);
  router.get("/season-cards/:id", controller.getSeasonCardById);
  router.post("/season-cards", controller.createSeasonCard);
  router.put("/season-cards/:id", controller.updateSeasonCard);
  router.delete("/season-cards/:id", controller.deleteSeasonCard);

  router.get("/hero-sections", controller.listHeroSections);
  router.put("/hero-sections/:sectionKey", controller.upsertHeroSection);

  return router;
}

export { createExperienceRoutes };
