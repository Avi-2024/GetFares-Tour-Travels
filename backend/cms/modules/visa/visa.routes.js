import express from "express";

function createVisaRoutes({ controller }) {
  const router = express.Router();

  // Visa destination routes
  router.route("/").get(controller.list).post(controller.create);
  router.route("/slug/:slug").get(controller.getBySlug);
  router.route("/:id").get(controller.getById).put(controller.update).delete(controller.delete);

  // Details routes
  router.route("/:id/details").get(controller.getDetails).post(controller.addDetail);
  router.route("/:id/details/:detailId").put(controller.updateDetail).delete(controller.deleteDetail);

  return router;
}

export { createVisaRoutes };
