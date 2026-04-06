import express from "express";

function createLandingRoutes({ controller }) {
  const router = express.Router();
  const uuidParam = ":id([0-9a-fA-F-]{36})";

  router.route("/").get(controller.list).post(controller.create);
  router.route("/reorder").patch(controller.reorder);
  router
    .route(`/${uuidParam}`)
    .get(controller.getById)
    .put(controller.update)
    .delete(controller.delete);

  return router;
}

export { createLandingRoutes };
