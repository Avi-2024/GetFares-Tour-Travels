import express from "express";
import { createMemoryUpload } from "../../../crm/core/uploads/index.js";

function createCmsMediaRoutes({ controller }) {
  const router = express.Router();
  const upload = createMemoryUpload({ maxFileSizeMb: 10 });

  router.get("/", controller.list);
  router.post("/upload", upload.single("file"), controller.upload);
  router.get("/:id", controller.getById);
  router.post("/", controller.create);
  router.put("/:id", controller.update);
  router.delete("/:id", controller.delete);

  return router;
}

export { createCmsMediaRoutes };
