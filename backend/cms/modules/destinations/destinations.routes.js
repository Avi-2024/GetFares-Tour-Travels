import express from "express";

function createDestinationsRoutes({ controller, upload }) {
  const router = express.Router();
  const destinationUpload = upload.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "gallery", maxCount: 50 },
  ]);

  router.route("/").get(controller.list).post(destinationUpload, controller.create);
  router.route("/slug/:slug").get(controller.getBySlug);
  router.route("/:id").get(controller.getById).put(destinationUpload, controller.update);

  router
    .route("/:id/media")
    .get(controller.getMedia)
    .post(upload.single("media"), controller.addMedia);
  router
    .route("/:id/media/:mediaId")
    .put(upload.single("media"), controller.updateMedia)
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
