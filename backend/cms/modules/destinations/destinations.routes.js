import express from 'express';

function createDestinationsRoutes({ controller }) {
  const router = express.Router();

  // Destination routes
  router.get('/', controller.list);
  router.get('/slug/:slug', controller.getBySlug);
  router.get('/:id', controller.getById);
  router.post('/', controller.create);
  router.put('/:id', controller.update);

  // Media routes
  router.get('/:id/media', controller.getMedia);
  router.post('/:id/media', controller.addMedia);
  router.put('/:id/media/:mediaId', controller.updateMedia);
  router.delete('/:id/media/:mediaId', controller.deleteMedia);

  // Season routes
  router.get('/:id/seasons', controller.getSeasons);
  router.post('/:id/seasons', controller.addSeason);
  router.put('/:id/seasons/:seasonId', controller.updateSeason);
  router.delete('/:id/seasons/:seasonId', controller.deleteSeason);

  // Package mapping routes
  router.get('/:id/packages', controller.getPackages);
  router.post('/:id/packages', controller.mapPackage);
  router.delete('/:id/packages/:mapId', controller.unmapPackage);

  return router;
}

export { createDestinationsRoutes };
