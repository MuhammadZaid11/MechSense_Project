import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const SAMPLE_MACHINE = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'MTR-01',
  name: '7.5 kW Induction Motor',
  machineType: 'motor',
  location: 'Pump House',
  status: 'running',
  createdAt: '2026-10-19T15:00:00.000Z',
  updatedAt: '2026-10-19T15:00:00.000Z',
};

function createTestApp(machineService) {
  return createApp({ machineService });
}

describe('GET /api/machines', () => {
  it('returns all machines in the documented JSON format', async () => {
    const app = createTestApp({
      listMachines: async () => [SAMPLE_MACHINE],
      getMachineById: async () => SAMPLE_MACHINE,
    });

    const response = await request(app).get('/api/machines');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [SAMPLE_MACHINE] });
  });

  it('handles database errors without leaking connection details', async () => {
    const app = createTestApp({
      listMachines: async () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:5432 password=super-secret');
        error.code = 'ECONNREFUSED';
        throw error;
      },
      getMachineById: async () => null,
    });

    const response = await request(app).get('/api/machines');
    const body = JSON.stringify(response.body);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database is unavailable',
        details: [],
      },
    });
    expect(body).not.toMatch(/password/i);
    expect(body).not.toMatch(/5432/);
    expect(body).not.toMatch(/ECONNREFUSED/);
    expect(body).not.toMatch(/SELECT/i);
  });
});

describe('GET /api/machines/:id', () => {
  it('returns one machine by UUID', async () => {
    const app = createTestApp({
      listMachines: async () => [SAMPLE_MACHINE],
      getMachineById: async (id) => (id === SAMPLE_MACHINE.id ? SAMPLE_MACHINE : null),
    });

    const response = await request(app).get(`/api/machines/${SAMPLE_MACHINE.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: SAMPLE_MACHINE });
  });

  it('returns 404 for an unknown machine', async () => {
    const app = createTestApp({
      listMachines: async () => [],
      getMachineById: async () => null,
    });

    const response = await request(app).get('/api/machines/22222222-2222-4222-8222-222222222222');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Machine not found',
        details: [{ field: 'id', reason: 'not_found' }],
      },
    });
  });

  it('returns 400 for an invalid UUID', async () => {
    const app = createTestApp({
      listMachines: async () => [],
      getMachineById: async () => {
        throw new Error('getMachineById should not be called for invalid UUIDs');
      },
    });

    const response = await request(app).get('/api/machines/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'id must be a valid UUID',
        details: [{ field: 'id', reason: 'invalid_uuid' }],
      },
    });
  });
});
