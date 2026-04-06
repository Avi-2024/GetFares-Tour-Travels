import express from "express";

function createVisaRoutes({ controller, upload }) {
  const router = express.Router();

  // Visa destination routes
  router
    .route("/")
    .get(controller.list)
    .post(upload.single("bannerImage"), controller.create);
  router.route("/slug/:slug").get(controller.getBySlug);
  router
    .route("/:id")
    .get(controller.getById)
    .put(upload.single("bannerImage"), controller.update)
    .delete(controller.delete);

  // Details routes
  router.route("/:id/details").get(controller.getDetails).post(controller.addDetail);
  router.route("/:id/details/:detailId").put(controller.updateDetail).delete(controller.deleteDetail);

  return router;
}

export { createVisaRoutes };
