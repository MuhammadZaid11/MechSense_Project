import { AppError } from '../errors/AppError.js';
import { isUuid } from '../validators/uuid.js';

export function createMachinesController(machineService) {
  return {
    async listMachines(_req, res) {
      const machines = await machineService.listMachines();
      res.status(200).json({ data: machines });
    },

    async getMachineById(req, res) {
      const { id } = req.params;

      if (!isUuid(id)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'id must be a valid UUID', [
          { field: 'id', reason: 'invalid_uuid' },
        ]);
      }

      const machine = await machineService.getMachineById(id);
      if (!machine) {
        throw new AppError(404, 'NOT_FOUND', 'Machine not found', [
          { field: 'id', reason: 'not_found' },
        ]);
      }

      res.status(200).json({ data: machine });
    },
  };
}
