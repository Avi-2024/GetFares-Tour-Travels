import { Router } from 'express';

function createCurrencyRoutes({ controller }) {
  const router = Router();

  router.get('/rates', controller.getRates);
  router.get('/convert', controller.convert);

  return router;
}

export { createCurrencyRoutes };
