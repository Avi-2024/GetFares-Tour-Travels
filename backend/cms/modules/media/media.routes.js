import express from "express";

function createCmsMediaRoutes({ controller, upload }) {
  const router = express.Router();

  router.route("/upload").post(upload.single("media"), controller.upload);

  router
    .route("/")
    .get(controller.list)
    .post(upload.single("media"), controller.create);
  router
    .route("/:id")
    .get(controller.getById)
    .put(upload.single("media"), controller.update)
    .delete(controller.delete);

  return router;
}

export { createCmsMediaRoutes };
