import express from "express";

function createDestinationsRoutes({ controller }) {
  const router = express.Router();

  router.route("/").get(controller.list).post(controller.create);
  router.route("/slug/:slug").get(controller.getBySlug);
  router.route("/:id").get(controller.getById).put(controller.update);

  router.route("/:id/media").get(controller.getMedia).post(controller.addMedia);
  router
    .route("/:id/media/:mediaId")
    .put(controller.updateMedia)
    .delete(controller.deleteMedia);

  router
    .route("/:id/seasons")
    .get(controller.getSeasons)
    .post(controller.addSeason);
  router
    .route("/:id/seasons/:seasonId")
    .put(controller.updateSeason)
    .delete(controller.deleteSeason);

  router
    .route("/:id/packages")
    .get(controller.getPackages)
    .post(controller.mapPackage);
  router.route("/:id/packages/:mapId").delete(controller.unmapPackage);

  return router;
}

export { createDestinationsRoutes };
