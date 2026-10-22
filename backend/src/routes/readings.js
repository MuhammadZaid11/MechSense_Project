import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createReadingsController } from '../controllers/readingsController.js';

export function createReadingsRouter(readingService) {
  const router = Router();
  const controller = createReadingsController(readingService);

  router.get('/readings/latest', asyncHandler(controller.listLatestReadings));
  router.post('/machines/:id/readings', asyncHandler(controller.ingestReading));
  router.get('/machines/:id/readings', asyncHandler(controller.listReadings));

  return router;
}
