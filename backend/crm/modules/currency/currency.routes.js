import { Router } from 'express';

function createCurrencyRoutes({ controller, middlewares }) {
  const router = Router();

  // Test endpoint
  router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Currency API is working!' });
  });

  router.get('/rates', controller.getRates);
  router.get('/convert', controller.convert);

  return router;
}

export { createCurrencyRoutes };
