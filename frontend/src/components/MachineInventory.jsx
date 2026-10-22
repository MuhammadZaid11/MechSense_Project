import { useCallback, useEffect, useState } from 'react';
import { fetchMachines } from '../api/client.js';

const STATUS_LABELS = {
  running: 'Running',
  stopped: 'Stopped',
  maintenance: 'Maintenance',
};

export default function MachineInventory() {
  const [inventory, setInventory] = useState({
    state: 'loading',
    machines: [],
    message: 'Loading machine inventory…',
  });

  const loadMachines = useCallback(async () => {
    setInventory((current) => ({
      ...current,
      state: 'loading',
      message: 'Loading machine inventory…',
    }));

    try {
      const machines = await fetchMachines();
      setInventory({
        state: machines.length === 0 ? 'empty' : 'success',
        machines,
        message:
          machines.length === 0
            ? 'No machines are registered yet. Run the backend seed command, then refresh.'
            : `${machines.length} demo machines loaded.`,
      });
    } catch (error) {
      setInventory({
        state: 'error',
        machines: [],
        message: error.message || 'Unable to load machines.',
      });
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  return (
    <section className="panel inventory-panel" aria-labelledby="inventory-heading">
      <div className="panel-header">
        <div>
          <h2 id="inventory-heading">Machine inventory</h2>
          <p className="panel-note">
            Demo assets only. Status values are seed data, not live telemetry.
          </p>
        </div>
        <button type="button" onClick={loadMachines}>
          Refresh
        </button>
      </div>

      {inventory.state === 'loading' ? (
        <p className="state-message" role="status">
          {inventory.message}
        </p>
      ) : null}

      {inventory.state === 'empty' ? (
        <p className="state-message" role="status">
          {inventory.message}
        </p>
      ) : null}

      {inventory.state === 'error' ? (
        <p className="state-message state-error" role="alert">
          {inventory.message}
        </p>
      ) : null}

      {inventory.state === 'success' ? (
        <div className="table-wrap">
          <table className="machine-table">
            <caption className="visually-hidden">{inventory.message}</caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Location</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.machines.map((machine) => (
                <tr key={machine.id}>
                  <td>{machine.code}</td>
                  <td>{machine.name}</td>
                  <td className="capitalize">{machine.machineType}</td>
                  <td>{machine.location || '—'}</td>
                  <td>
                    <span className={`badge badge-${machine.status}`}>
                      {STATUS_LABELS[machine.status] ?? machine.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
