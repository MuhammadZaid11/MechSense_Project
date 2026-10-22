import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { AppError } from '../src/errors/AppError.js';
import { createApp } from '../src/app.js';

const ALERT = {
  id: '33333333-3333-4333-8333-333333333333',
  machineId: '11111111-1111-4111-8111-111111111111',
  machineCode: 'MTR-01',
  alertRuleId: '44444444-4444-4444-8444-444444444444',
  metric: 'temperature_c',
  severity: 'warning',
  status: 'active',
  message: 'Demo warning temperature rule',
  triggeredValue: 72,
  triggeredAt: '2026-10-19T18:00:00.000Z',
  acknowledgedAt: null,
  acknowledgedBy: null,
  resolvedAt: null,
  createdAt: '2026-10-19T18:00:00.000Z',
  updatedAt: '2026-10-19T18:00:00.000Z',
};

function createTestApp(alertService) {
  return createApp({
    machineService: {
      listMachines: async () => [],
      getMachineById: async () => null,
    },
    readingService: {
      ingestReading: async () => ({ reading: null, alerts: [] }),
      listReadings: async () => [],
      listLatestReadings: async () => [],
    },
    alertService,
    simulatorStatus: () => ({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
  });
}

describe('alert APIs', () => {
  it('lists alerts', async () => {
    const app = createTestApp({
      listAlerts: async () => [ALERT],
      listOpenAlerts: async () => [ALERT],
      getAlertById: async () => ALERT,
      acknowledgeAlert: async () => ({ ...ALERT, status: 'acknowledged' }),
      resolveAlert: async () => ({ ...ALERT, status: 'resolved' }),
    });

    const response = await request(app).get('/api/alerts?status=active');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [ALERT] });
  });

  it('acknowledges and resolves an alert', async () => {
    const app = createTestApp({
      listAlerts: async () => [],
      listOpenAlerts: async () => [],
      getAlertById: async () => ALERT,
      acknowledgeAlert: async () => ({
        ...ALERT,
        status: 'acknowledged',
        acknowledgedBy: 'tech',
      }),
      resolveAlert: async () => ({ ...ALERT, status: 'resolved' }),
    });

    const ack = await request(app)
      .post(`/api/alerts/${ALERT.id}/acknowledge`)
      .send({ acknowledgedBy: 'tech' });
    expect(ack.status).toBe(200);
    expect(ack.body.data.status).toBe('acknowledged');

    const resolved = await request(app).post(`/api/alerts/${ALERT.id}/resolve`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('resolved');
  });

  it('returns 400 for an invalid alert id', async () => {
    const app = createTestApp({
      listAlerts: async () => [],
      listOpenAlerts: async () => [],
      getAlertById: async () => {
        throw new AppError(400, 'VALIDATION_ERROR', 'id must be a valid UUID', [
          { field: 'id', reason: 'invalid_uuid' },
        ]);
      },
      acknowledgeAlert: async () => null,
      resolveAlert: async () => null,
    });

    const response = await request(app).get('/api/alerts/not-a-uuid');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
