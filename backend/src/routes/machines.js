import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createMachinesController } from '../controllers/machinesController.js';

export function createMachinesRouter(machineService) {
  const router = Router();
  const controller = createMachinesController(machineService);

  router.get('/machines', asyncHandler(controller.listMachines));
  router.get('/machines/:id', asyncHandler(controller.getMachineById));

  return router;
}
