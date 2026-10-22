import { useCallback, useEffect, useState } from 'react';
import { fetchSnapshot } from '../api/client.js';

const QUALITY_LABELS = {
  fresh: 'Fresh',
  stale: 'Stale',
  invalid: 'Invalid',
  out_of_order: 'Out of order',
};

export default function MonitoringPanel() {
  const [snapshot, setSnapshot] = useState({
    state: 'loading',
    data: null,
    message: 'Loading live simulation…',
  });

  const loadSnapshot = useCallback(async () => {
    try {
      const data = await fetchSnapshot();
      setSnapshot({
        state: 'success',
        data,
        message: data.disclaimer,
      });
    } catch (error) {
      setSnapshot({
        state: 'error',
        data: null,
        message: error.message || 'Unable to load the monitoring snapshot.',
      });
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const timer = window.setInterval(loadSnapshot, 5000);
    return () => window.clearInterval(timer);
  }, [loadSnapshot]);

  return (
    <section className="panel inventory-panel" aria-labelledby="monitoring-heading">
      <div className="panel-header">
        <div>
          <h2 id="monitoring-heading">Live simulation</h2>
          <p className="panel-note">
            Software-generated readings only. Demo thresholds are teaching values, not
            certified safety limits. Historical charts come in a later phase.
          </p>
        </div>
        <button type="button" onClick={loadSnapshot}>
          Refresh
        </button>
      </div>

      {snapshot.state === 'loading' ? (
        <p className="state-message" role="status">
          {snapshot.message}
        </p>
      ) : null}

      {snapshot.state === 'error' ? (
        <p className="state-message state-error" role="alert">
          {snapshot.message}
        </p>
      ) : null}

      {snapshot.state === 'success' && snapshot.data ? (
        <>
          <dl className="meta">
            <div>
              <dt>Simulator</dt>
              <dd>{snapshot.data.simulator.enabled ? 'Running' : 'Stopped'}</dd>
            </div>
            <div>
              <dt>Interval</dt>
              <dd>{snapshot.data.simulator.intervalMs} ms</dd>
            </div>
            <div>
              <dt>Last tick</dt>
              <dd>{snapshot.data.simulator.lastTickAt ?? '—'}</dd>
            </div>
            <div>
              <dt>Stale window</dt>
              <dd>{snapshot.data.staleAfterSeconds}s (demo)</dd>
            </div>
          </dl>

          <div className="table-wrap">
            <table className="machine-table">
              <caption className="visually-hidden">Latest simulated readings</caption>
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Temp °C</th>
                  <th scope="col">Vibration mm/s</th>
                  <th scope="col">Running</th>
                  <th scope="col">Quality</th>
                  <th scope="col">Open alerts</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.data.machines.map((machine) => (
                  <tr key={machine.id}>
                    <td>{machine.code}</td>
                    <td>{machine.latestReading?.temperatureC ?? '—'}</td>
                    <td>{machine.latestReading?.vibrationMmS ?? '—'}</td>
                    <td>{machine.latestReading ? (machine.latestReading.isRunning ? 'Yes' : 'No') : '—'}</td>
                    <td>
                      {machine.latestReading
                        ? QUALITY_LABELS[machine.latestReading.quality] ?? machine.latestReading.quality
                        : 'No reading'}
                    </td>
                    <td>{machine.openAlertCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="subheading">Open demo alerts</h3>
          {snapshot.data.openAlerts.length === 0 ? (
            <p className="state-message" role="status">
              No active demo alerts.
            </p>
          ) : (
            <ul className="alert-list">
              {snapshot.data.openAlerts.map((alert) => (
                <li key={alert.id}>
                  <strong>{alert.machineCode}</strong> · {alert.severity} · {alert.metric}: {alert.message}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </section>
  );
}
