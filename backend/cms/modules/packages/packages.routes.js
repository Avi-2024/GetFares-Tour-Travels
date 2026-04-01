import express from "express";

function createCmsPackagesRoutes({ controller }) {
  const router = express.Router();

  // Published packages from CRM
  router.get("/published", controller.listPublished);
  router.get("/published/:id", controller.getPackageById);

  // Main packages
  router.get("/main", controller.listMainPackages);
  router.get("/main/:id", controller.getMainPackageById);
  router.post("/main", controller.createMainPackage);
  router.put("/main/:id", controller.updateMainPackage);
  router.delete("/main/:id", controller.deleteMainPackage);

  // Sub packages
  router.get("/main/:mainPackageId/sub", controller.listSubPackages);
  router.post("/sub", controller.createSubPackage);
  router.put("/sub/:id", controller.updateSubPackage);
  router.delete("/sub/:id", controller.deleteSubPackage);

  return router;
}

export { createCmsPackagesRoutes };
