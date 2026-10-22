import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { AppError } from '../src/errors/AppError.js';
import { createApp } from '../src/app.js';
import { parseLimit } from '../src/validators/reading.js';

const MACHINE_ID = '11111111-1111-4111-8111-111111111111';
const READING = {
  id: 1,
  machineId: MACHINE_ID,
  machineCode: 'MTR-01',
  temperatureC: 72.5,
  vibrationMmS: 4.8,
  isRunning: true,
  recordedAt: '2026-10-19T18:00:00.000Z',
  ingestedAt: '2026-10-19T18:00:00.100Z',
  quality: 'fresh',
};

function createTestApp(readingService) {
  return createApp({
    machineService: {
      listMachines: async () => [],
      getMachineById: async () => null,
    },
    readingService,
    alertService: {
      listAlerts: async () => [],
      listOpenAlerts: async () => [],
      getAlertById: async () => null,
      acknowledgeAlert: async () => null,
      resolveAlert: async () => null,
    },
    simulatorStatus: () => ({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
    simulatorControls: {
      getStatus: () => ({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
      start: () => ({ enabled: true, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
      stop: () => ({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
    },
  });
}

describe('parseLimit', () => {
  it('defaults to 50 and rejects values above 200', () => {
    expect(parseLimit(undefined)).toBe(50);
    expect(parseLimit('50')).toBe(50);
    expect(() => parseLimit('201')).toThrow(/limit must be an integer/);
    expect(() => parseLimit('0')).toThrow(/limit must be an integer/);
  });
});

describe('POST /api/machines/:id/readings', () => {
  it('creates a reading', async () => {
    const ingestReading = vi.fn().mockResolvedValue({
      reading: READING,
      alerts: [],
    });
    const app = createTestApp({
      ingestReading,
      listReadings: async () => [READING],
      listLatestReadings: async () => [READING],
    });

    const response = await request(app)
      .post(`/api/machines/${MACHINE_ID}/readings`)
      .send({
        temperatureC: 72.5,
        vibrationMmS: 4.8,
        isRunning: true,
        recordedAt: '2026-10-19T18:00:00.000Z',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: { reading: READING, alerts: [] } });
    expect(ingestReading).toHaveBeenCalled();
  });

  it('returns 400 for invalid machine IDs and payloads', async () => {
    const app = createTestApp({
      ingestReading: async () => {
        throw new AppError(400, 'VALIDATION_ERROR', 'id must be a valid UUID', [
          { field: 'id', reason: 'invalid_uuid' },
        ]);
      },
      listReadings: async () => [],
      listLatestReadings: async () => [],
    });

    const response = await request(app)
      .post('/api/machines/not-a-uuid/readings')
      .send({ temperatureC: 60, vibrationMmS: 2, isRunning: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/readings/latest', () => {
  it('returns the latest reading for each machine', async () => {
    const app = createTestApp({
      ingestReading: async () => ({ reading: READING, alerts: [] }),
      listReadings: async () => [READING],
      listLatestReadings: async () => [READING],
    });

    const response = await request(app).get('/api/readings/latest');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [READING] });
  });

  it('handles database errors without leaking connection details', async () => {
    const app = createTestApp({
      ingestReading: async () => ({ reading: READING, alerts: [] }),
      listReadings: async () => [],
      listLatestReadings: async () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:5432 password=super-secret');
        error.code = 'ECONNREFUSED';
        throw error;
      },
    });

    const response = await request(app).get('/api/readings/latest');
    const body = JSON.stringify(response.body);

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('DATABASE_UNAVAILABLE');
    expect(body).not.toMatch(/password/i);
    expect(body).not.toMatch(/5432/);
    expect(body).not.toMatch(/ECONNREFUSED/);
  });
});

describe('GET /api/machines/:id/readings', () => {
  it('returns history and forwards the requested limit', async () => {
    const listReadings = vi.fn().mockResolvedValue([READING]);
    const app = createTestApp({
      ingestReading: async () => ({ reading: READING, alerts: [] }),
      listReadings,
      listLatestReadings: async () => [READING],
    });

    const response = await request(app).get(`/api/machines/${MACHINE_ID}/readings?limit=50`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [READING] });
    expect(listReadings).toHaveBeenCalledWith(MACHINE_ID, '50');
  });

  it('returns 400 for an invalid machine id', async () => {
    const app = createTestApp({
      ingestReading: async () => ({ reading: READING, alerts: [] }),
      listReadings: async () => {
        throw new AppError(400, 'VALIDATION_ERROR', 'id must be a valid UUID', [
          { field: 'id', reason: 'invalid_uuid' },
        ]);
      },
      listLatestReadings: async () => [],
    });

    const response = await request(app).get('/api/machines/not-a-uuid/readings');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for an invalid limit', async () => {
    const app = createTestApp({
      ingestReading: async () => ({ reading: READING, alerts: [] }),
      listReadings: async (_id, limit) => {
        parseLimit(limit);
        return [READING];
      },
      listLatestReadings: async () => [],
    });

    const response = await request(app).get(`/api/machines/${MACHINE_ID}/readings?limit=999`);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
