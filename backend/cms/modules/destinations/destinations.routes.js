import express from "express";

function createDestinationsRoutes({ controller, upload }) {
  const router = express.Router();
  const destinationUpload = upload.any();

  router.route("/").get(controller.list).post(destinationUpload, controller.create);
  router.route("/deleted").get(controller.listDeleted);
  router.route("/slug/:slug").get(controller.getBySlug);
  router
    .route("/:id")
    .get(controller.getById)
    .put(destinationUpload, controller.update)
    .delete(controller.delete);
  router.route("/:id/hard-delete").delete(controller.hardDelete);
  router.route("/:id/status").patch(controller.updateStatus);

  router
    .route("/:id/media")
    .get(controller.getMedia)
    .post(upload.any(), controller.addMedia);
  router
    .route("/:id/media/:mediaId")
    .put(upload.any(), controller.updateMedia)
    .delete(controller.deleteMedia);
  router.route("/:id/media/:mediaId/hard-delete").delete(controller.hardDeleteMedia);

  router
    .route("/:id/seasons")
    .get(controller.getSeasons)
    .post(controller.addSeason);
  router
    .route("/:id/seasons/:seasonId")
    .put(controller.updateSeason)
    .delete(controller.deleteSeason);
  router.route("/:id/seasons/:seasonId/hard-delete").delete(controller.hardDeleteSeason);

  router
    .route("/:id/packages")
    .get(controller.getPackages)
    .post(controller.mapPackage);
  router.route("/:id/packages/:mapId").delete(controller.unmapPackage);
  router.route("/:id/packages/:mapId/hard-delete").delete(controller.hardUnmapPackage);

  return router;
}

export { createDestinationsRoutes };
