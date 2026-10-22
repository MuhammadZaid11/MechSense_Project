import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createAlertsController } from '../controllers/alertsController.js';

export function createAlertsRouter(alertService) {
  const router = Router();
  const controller = createAlertsController(alertService);

  router.get('/alerts', asyncHandler(controller.listAlerts));
  router.get('/alerts/:id', asyncHandler(controller.getAlertById));
  router.post('/alerts/:id/acknowledge', asyncHandler(controller.acknowledgeAlert));
  router.post('/alerts/:id/resolve', asyncHandler(controller.resolveAlert));

  return router;
}
