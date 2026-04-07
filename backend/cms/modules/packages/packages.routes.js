import express from "express";

function createCmsPackagesRoutes({ controller, upload }) {
  const router = express.Router();

  router
    .route("/published")
    .get(controller.listPublished)
    .post(upload.single("bannerImage"), controller.createPublishedPackage);
  router
    .route("/published/:id")
    .get(controller.getPackageById)
    .put(upload.single("bannerImage"), controller.updatePublishedPackage)
    .delete(controller.deletePublishedPackage);

  router
    .route("/main")
    .get(controller.listMainPackages)
    .post(controller.createMainPackage);
  router
    .route("/main/:id")
    .get(controller.getMainPackageById)
    .put(controller.updateMainPackage)
    .delete(controller.deleteMainPackage);

  router.route("/main/:mainPackageId/sub").get(controller.listSubPackages);
  router.route("/sub").post(controller.createSubPackage);
  router
    .route("/sub/:id")
    .put(controller.updateSubPackage)
    .delete(controller.deleteSubPackage);

  return router;
}

export { createCmsPackagesRoutes };
