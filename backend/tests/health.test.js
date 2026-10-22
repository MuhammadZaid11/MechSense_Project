import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('returns ok status and service metadata', async () => {
    const app = createApp({
      machineService: {
        listMachines: async () => [],
        getMachineById: async () => null,
      },
    });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'mechsense-api',
      version: '1.0.0-phase3',
    });
    expect(typeof response.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });
});
