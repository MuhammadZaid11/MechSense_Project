import { AppError } from '../errors/AppError.js';

export function createAlertsController(alertService) {
  return {
    async listAlerts(req, res) {
      const alerts = await alertService.listAlerts(req.query.status);
      res.status(200).json({ data: alerts });
    },

    async getAlertById(req, res) {
      const alert = await alertService.getAlertById(req.params.id);
      if (!alert) {
        throw new AppError(404, 'NOT_FOUND', 'Alert not found', [
          { field: 'id', reason: 'not_found' },
        ]);
      }

      res.status(200).json({ data: alert });
    },

    async acknowledgeAlert(req, res) {
      const alert = await alertService.acknowledgeAlert(req.params.id, req.body?.acknowledgedBy);
      res.status(200).json({ data: alert });
    },

    async resolveAlert(req, res) {
      const alert = await alertService.resolveAlert(req.params.id);
      res.status(200).json({ data: alert });
    },
  };
}
