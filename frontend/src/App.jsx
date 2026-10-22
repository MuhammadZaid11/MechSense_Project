import { useCallback, useEffect, useState } from 'react';
import { fetchHealth, getApiBaseUrl } from './api/client.js';
import MachineInventory from './components/MachineInventory.jsx';
import MonitoringPanel from './components/MonitoringPanel.jsx';
import './App.css';

const POLL_MS = 10_000;

const STATUS_COPY = {
  checking: {
    label: 'Checking',
    detail: 'Requesting GET /api/health…',
  },
  connected: {
    label: 'Connected',
    detail: 'Backend health endpoint responded with status ok.',
  },
  disconnected: {
    label: 'Disconnected',
    detail: 'Cannot reach the API. Start the backend on port 3001, then retry.',
  },
  error: {
    label: 'Error',
    detail: 'The API responded, but the health check failed.',
  },
};

export default function App() {
  const [connection, setConnection] = useState({
    state: 'checking',
    message: STATUS_COPY.checking.detail,
    payload: null,
    checkedAt: null,
  });

  const checkHealth = useCallback(async () => {
    setConnection((current) => ({
      ...current,
      state: current.state === 'connected' ? current.state : 'checking',
    }));

    try {
      const payload = await fetchHealth();
      setConnection({
        state: 'connected',
        message: STATUS_COPY.connected.detail,
        payload,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      const state = error.kind === 'error' ? 'error' : 'disconnected';
      setConnection({
        state,
        message: error.message || STATUS_COPY[state].detail,
        payload: null,
        checkedAt: new Date().toISOString(),
      });
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const timer = window.setInterval(checkHealth, POLL_MS);
    return () => window.clearInterval(timer);
  }, [checkHealth]);

  const status = STATUS_COPY[connection.state];

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Phase 3 · Software simulation</p>
          <h1>MechSense</h1>
          <p className="subtitle">
            Smart machine monitoring prototype for motors, pumps, and conveyors.
            This version is simulation-only and is not a certified safety or
            diagnostic system.
          </p>
        </div>
        <div className={`status-card status-${connection.state}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <p className="status-label">{status.label}</p>
            <p className="status-detail">{connection.message}</p>
          </div>
        </div>
      </header>

      <main className="content">
        <MachineInventory />
        <MonitoringPanel />

        <section className="panel">
          <div className="panel-header">
            <h2>Application health</h2>
            <button type="button" onClick={checkHealth}>
              Recheck
            </button>
          </div>
          <dl className="meta">
            <div>
              <dt>API base URL</dt>
              <dd>{getApiBaseUrl()}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd>GET /api/health</dd>
            </div>
            <div>
              <dt>Service</dt>
              <dd>{connection.payload?.service ?? '—'}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{connection.payload?.version ?? '—'}</dd>
            </div>
            <div>
              <dt>Server timestamp</dt>
              <dd>{connection.payload?.timestamp ?? '—'}</dd>
            </div>
            <div>
              <dt>Last check</dt>
              <dd>{connection.checkedAt ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel muted">
          <h2>Coming in later phases</h2>
          <ul>
            <li>Historical temperature and vibration charts</li>
            <li>Interactive alert acknowledgement in the dashboard</li>
            <li>Maintenance records and schedules</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
