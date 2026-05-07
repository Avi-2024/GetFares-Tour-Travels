import { Router } from "express";

function createMailRoutes({ controller }) {
  const router = Router();

  router.post("/send-test", controller.sendTestEmail);
  router.get("/verify", controller.verifyConnection);

  return router;
}

export { createMailRoutes };
