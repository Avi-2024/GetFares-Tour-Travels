import express from "express";

function createLandingRoutes({ controller, upload }) {
  const router = express.Router();
  const uuidParam = ":id([0-9a-fA-F-]{36})";

  router
    .route("/")
    .get(controller.list)
    .post(upload.single("bannerImage"), controller.create);
  router.route("/reorder").patch(controller.reorder);
  router.route(`/${uuidParam}/status`).patch(controller.updateStatus);
  router
    .route(`/${uuidParam}`)
    .get(controller.getById)
    .put(upload.single("bannerImage"), controller.update)
    .delete(controller.delete);

  return router;
}

export { createLandingRoutes };
