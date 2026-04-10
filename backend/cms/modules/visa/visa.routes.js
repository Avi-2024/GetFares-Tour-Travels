import express from "express";

function createVisaRoutes({ controller, upload }) {
  const router = express.Router();

  // Visa destination routes
  router
    .route("/")
    .get(controller.list)
    .post(upload.any(), controller.create);
  router.route("/slug/:slug").get(controller.getBySlug);
  router.route("/:id/status").patch(controller.updateStatus);
  router
    .route("/:id")
    .get(controller.getById)
    .put(upload.any(), controller.update)
    .delete(controller.delete);

  // Details routes
  router.route("/:id/details").get(controller.getDetails).post(controller.addDetail);
  router.route("/:id/details/:detailId").put(controller.updateDetail).delete(controller.deleteDetail);

  return router;
}

export { createVisaRoutes };
