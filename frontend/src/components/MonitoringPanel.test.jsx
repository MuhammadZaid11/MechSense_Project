import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MonitoringPanel from './MonitoringPanel.jsx';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MonitoringPanel', () => {
  it('shows latest readings after a successful snapshot', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            disclaimer: 'Demo thresholds are teaching values.',
            staleAfterSeconds: 30,
            simulator: { enabled: true, intervalMs: 5000, lastTickAt: '2026-10-19T18:00:00.000Z', tickCount: 1 },
            machines: [
              {
                id: '11111111-1111-4111-8111-111111111111',
                code: 'MTR-01',
                latestReading: {
                  temperatureC: 62.1,
                  vibrationMmS: 3.2,
                  isRunning: true,
                  quality: 'fresh',
                },
                openAlertCount: 1,
              },
            ],
            openAlerts: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                machineCode: 'MTR-01',
                severity: 'warning',
                metric: 'temperature_c',
                message: 'Demo warning',
              },
            ],
          },
        }),
      }),
    );

    render(<MonitoringPanel />);
    expect(await screen.findByText('62.1')).toBeInTheDocument();
    expect(screen.getAllByText('MTR-01').length).toBeGreaterThan(0);
    expect(screen.getByText('Fresh')).toBeInTheDocument();
    expect(screen.getByText(/Demo warning/)).toBeInTheDocument();
  });

  it('shows an error state when the snapshot request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable' },
        }),
      }),
    );

    render(<MonitoringPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');
  });
});
