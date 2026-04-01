import express from "express";

function createVisaRoutes({ controller }) {
  const router = express.Router();

  // Visa destination routes
  router.get("/", controller.list);
  router.get("/slug/:slug", controller.getBySlug);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);

  // Details routes
  router.get("/:id/details", controller.getDetails);
  router.post("/:id/details", controller.addDetail);
  router.put("/:id/details/:detailId", controller.updateDetail);
  router.delete("/:id/details/:detailId", controller.deleteDetail);

  return router;
}

export { createVisaRoutes };
