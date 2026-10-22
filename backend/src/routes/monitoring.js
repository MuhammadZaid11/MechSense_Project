import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createMonitoringController } from '../controllers/monitoringController.js';

export function createMonitoringRouter(monitoringService, simulatorControls) {
  const router = Router();
  const controller = createMonitoringController(monitoringService, simulatorControls);

  router.get('/monitoring/snapshot', asyncHandler(controller.getSnapshot));
  router.get('/simulator', asyncHandler(controller.getSimulator));
  router.post('/simulator/start', asyncHandler(controller.startSimulator));
  router.post('/simulator/stop', asyncHandler(controller.stopSimulator));

  return router;
}
