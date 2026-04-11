import express from "express";

function createCmsPackagesRoutes({ controller, upload }) {
  const router = express.Router();

  router
    .route("/published")
    .get(controller.listPublished)
    .post(upload.any(), controller.createPublishedPackage);
  router.route("/published/deleted").get(controller.listDeleted);
  router
    .route("/published/:id")
    .get(controller.getPackageById)
    .put(upload.any(), controller.updatePublishedPackage)
    .delete(controller.deletePublishedPackage);
  router.route("/published/:id/restore").patch(controller.restorePublishedPackage);
  router.route("/published/:id/hard-delete").delete(controller.hardDeletePublishedPackage);

  router
    .route("/main")
    .get(controller.listMainPackages)
    .post(controller.createMainPackage);
  router.route("/main/deleted").get(controller.listDeletedMainPackages);
  router
    .route("/main/:id")
    .get(controller.getMainPackageById)
    .put(controller.updateMainPackage)
    .delete(controller.deleteMainPackage);
  router.route("/main/:id/restore").patch(controller.restoreMainPackage);
  router.route("/main/:id/hard-delete").delete(controller.hardDeleteMainPackage);

  router.route("/main/:mainPackageId/sub").get(controller.listSubPackages);
  router.route("/sub/deleted").get(controller.listDeletedSubPackages);
  router.route("/sub").post(controller.createSubPackage);
  router
    .route("/sub/:id")
    .put(controller.updateSubPackage)
    .delete(controller.deleteSubPackage);
  router.route("/sub/:id/restore").patch(controller.restoreSubPackage);
  router.route("/sub/:id/hard-delete").delete(controller.hardDeleteSubPackage);

  return router;
}

export { createCmsPackagesRoutes };
