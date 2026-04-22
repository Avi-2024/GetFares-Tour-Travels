import express from "express";

function createLandingRoutes({ controller, upload }) {
  const router = express.Router();
  const uuidParam = ":id([0-9a-fA-F-]{36})";

  router
    .route("/")
    .get(controller.list)
    .post(upload.any(), controller.create);
  router.route("/deleted").get(controller.listDeleted);
  router.route("/reorder").patch(controller.reorder);
  router.route(`/${uuidParam}/status`).patch(controller.updateStatus);
  router
    .route(`/${uuidParam}`)
    .get(controller.getById)
    .put(upload.any(), controller.update)
    .delete(controller.delete);
  router.route(`/${uuidParam}/restore`).patch(controller.restore);
  router.route(`/${uuidParam}/hard-delete`).delete(controller.hardDelete);

  return router;
}

export { createLandingRoutes };
