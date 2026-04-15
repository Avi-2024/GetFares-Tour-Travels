import express from "express";

function createVisaRoutes({ controller, upload }) {
  const router = express.Router();

  // Visa destination routes
  router
    .route("/")
    .get(controller.list)
    .post(upload.any(), controller.create);
  router.route("/deleted").get(controller.listDeleted);
  router.route("/slug/:slug").get(controller.getBySlug);
  router.route("/:id/status").patch(controller.updateStatus);
  router
    .route("/:id")
    .get(controller.getById)
    .put(upload.any(), controller.update)
    .delete(controller.delete);
  router.route("/:id/restore").patch(controller.restore);
  router.route("/:id/hard-delete").delete(controller.hardDelete);

  return router;
}

export { createVisaRoutes };
