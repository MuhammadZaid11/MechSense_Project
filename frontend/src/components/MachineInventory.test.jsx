import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MachineInventory from './MachineInventory.jsx';

function mockFetch(payload, { ok = true, status = 200 } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => payload,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('MachineInventory', () => {
  it('shows a loading state and then the machine list', async () => {
    mockFetch({
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          code: 'MTR-01',
          name: '7.5 kW Induction Motor',
          machineType: 'motor',
          location: 'Pump House',
          status: 'running',
        },
      ],
    });

    render(<MachineInventory />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading machine inventory');
    expect(await screen.findByText('MTR-01')).toBeInTheDocument();
    expect(screen.getByText('7.5 kW Induction Motor')).toBeInTheDocument();
    expect(screen.getByText('Pump House')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('shows an empty state when the API returns no machines', async () => {
    mockFetch({ data: [] });

    render(<MachineInventory />);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('No machines are registered yet');
    });
  });

  it('shows an error state when the machines request fails', async () => {
    mockFetch(
      { error: { code: 'DATABASE_UNAVAILABLE', message: 'Database is unavailable' } },
      { ok: false, status: 503 },
    );

    render(<MachineInventory />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Database is unavailable');

    mockFetch({ data: [] });
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('No machines are registered yet');
    });
  });
});
