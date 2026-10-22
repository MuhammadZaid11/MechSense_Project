import { AppError } from '../errors/AppError.js';
import { isUuid } from '../validators/uuid.js';
import { parseAlertStatus } from '../validators/reading.js';
import { mapAlert } from './mappers.js';

const ALERT_SELECT = `
  SELECT a.id, a.machine_id, m.code AS machine_code, a.alert_rule_id,
         r.metric, r.severity, a.status, a.message, a.triggered_value,
         a.triggered_at, a.acknowledged_at, a.acknowledged_by, a.resolved_at,
         a.created_at, a.updated_at
  FROM alerts a
  JOIN machines m ON m.id = a.machine_id
  JOIN alert_rules r ON r.id = a.alert_rule_id
`;

function requireUuid(id, field = 'id') {
  if (!isUuid(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${field} must be a valid UUID`, [
      { field, reason: 'invalid_uuid' },
    ]);
  }
}

export function createAlertService({ query }) {
  return {
    async listOpenAlerts() {
      const result = await query(
        `
          ${ALERT_SELECT}
          WHERE a.status IN ('active', 'acknowledged')
          ORDER BY a.triggered_at DESC
        `,
      );

      return result.rows.map(mapAlert);
    },

    async listAlerts(statusValue) {
      const status = parseAlertStatus(statusValue);
      const params = [];
      let where = '';

      if (status) {
        params.push(status);
        where = `WHERE a.status = $1`;
      }

      const result = await query(
        `
          ${ALERT_SELECT}
          ${where}
          ORDER BY a.triggered_at DESC
        `,
        params,
      );

      return result.rows.map(mapAlert);
    },

    async getAlertById(id) {
      requireUuid(id);
      const result = await query(`${ALERT_SELECT} WHERE a.id = $1`, [id]);
      return result.rows[0] ? mapAlert(result.rows[0]) : null;
    },

    async acknowledgeAlert(id, acknowledgedBy) {
      requireUuid(id);
      const name = typeof acknowledgedBy === 'string' && acknowledgedBy.trim()
        ? acknowledgedBy.trim().slice(0, 80)
        : 'operator';

      const result = await query(
        `
          UPDATE alerts
          SET status = 'acknowledged',
              acknowledged_at = now(),
              acknowledged_by = $2,
              updated_at = now()
          WHERE id = $1 AND status = 'active'
          RETURNING id
        `,
        [id, name],
      );

      if (result.rowCount === 0) {
        const existing = await query('SELECT status FROM alerts WHERE id = $1', [id]);
        if (!existing.rows[0]) {
          throw new AppError(404, 'NOT_FOUND', 'Alert not found', [
            { field: 'id', reason: 'not_found' },
          ]);
        }

        throw new AppError(409, 'CONFLICT', 'Only active alerts can be acknowledged', [
          { field: 'status', reason: 'invalid_transition' },
        ]);
      }

      return this.getAlertById(id);
    },

    async resolveAlert(id) {
      requireUuid(id);
      const result = await query(
        `
          UPDATE alerts
          SET status = 'resolved',
              resolved_at = now(),
              updated_at = now()
          WHERE id = $1 AND status IN ('active', 'acknowledged')
          RETURNING id
        `,
        [id],
      );

      if (result.rowCount === 0) {
        const existing = await query('SELECT status FROM alerts WHERE id = $1', [id]);
        if (!existing.rows[0]) {
          throw new AppError(404, 'NOT_FOUND', 'Alert not found', [
            { field: 'id', reason: 'not_found' },
          ]);
        }

        throw new AppError(409, 'CONFLICT', 'Alert is already resolved', [
          { field: 'status', reason: 'invalid_transition' },
        ]);
      }

      return this.getAlertById(id);
    },
  };
}
