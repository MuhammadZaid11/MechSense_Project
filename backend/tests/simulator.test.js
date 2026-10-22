import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { startSimulator, stopSimulator } from '../src/services/simulator.js';

afterEach(() => {
  stopSimulator();
  vi.useRealTimers();
});

describe('simulator loop', () => {
  it('does not start a second interval when start is called twice', async () => {
    vi.useFakeTimers();
    const ingestReading = vi.fn().mockResolvedValue({ reading: {}, alerts: [] });
    const deps = {
      machineService: {
        listMachines: vi.fn().mockResolvedValue([
          { id: '11111111-1111-4111-8111-111111111111', code: 'MTR-01', machineType: 'motor', status: 'running' },
        ]),
      },
      readingService: { ingestReading },
    };

    startSimulator(deps);
    startSimulator(deps);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(ingestReading.mock.calls.length).toBe(3);
  });

  it('exposes start and stop endpoints', async () => {
    const controls = {
      getStatus: vi.fn().mockReturnValue({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 0 }),
      start: vi.fn().mockReturnValue({ enabled: true, intervalMs: 5000, lastTickAt: null, tickCount: 1 }),
      stop: vi.fn().mockReturnValue({ enabled: false, intervalMs: 5000, lastTickAt: null, tickCount: 1 }),
    };

    const app = createApp({
      machineService: { listMachines: async () => [], getMachineById: async () => null },
      readingService: {
        ingestReading: async () => ({ reading: {}, alerts: [] }),
        listReadings: async () => [],
        listLatestReadings: async () => [],
      },
      alertService: {
        listAlerts: async () => [],
        listOpenAlerts: async () => [],
        getAlertById: async () => null,
        acknowledgeAlert: async () => null,
        resolveAlert: async () => null,
      },
      simulatorControls: controls,
    });

    const started = await request(app).post('/api/simulator/start');
    const stopped = await request(app).post('/api/simulator/stop');

    expect(started.status).toBe(200);
    expect(started.body.data.enabled).toBe(true);
    expect(stopped.status).toBe(200);
    expect(stopped.body.data.enabled).toBe(false);
    expect(controls.start).toHaveBeenCalledTimes(1);
    expect(controls.stop).toHaveBeenCalledTimes(1);
  });
});
