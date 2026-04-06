import express from "express";

function createCmsMediaRoutes({ controller }) {
  const router = express.Router();

  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);

  return router;
}

export { createCmsMediaRoutes };
