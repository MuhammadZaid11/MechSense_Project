const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

async function requestJson(path, { signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    const disconnected = new Error('Unable to reach the MechSense API');
    disconnected.kind = 'disconnected';
    throw disconnected;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const httpError = new Error(payload?.error?.message || `Request failed with HTTP ${response.status}`);
    httpError.kind = 'error';
    httpError.status = response.status;
    httpError.code = payload?.error?.code;
    throw httpError;
  }

  return payload;
}

export async function fetchHealth({ signal } = {}) {
  const payload = await requestJson('/api/health', { signal });

  if (payload.status !== 'ok') {
    const unexpected = new Error('Health payload did not report status ok');
    unexpected.kind = 'error';
    throw unexpected;
  }

  return payload;
}

export async function fetchMachines({ signal } = {}) {
  const payload = await requestJson('/api/machines', { signal });

  if (!payload || !Array.isArray(payload.data)) {
    const invalid = new Error('Machines endpoint returned an unexpected payload');
    invalid.kind = 'error';
    throw invalid;
  }

  return payload.data;
}

export async function fetchSnapshot({ signal } = {}) {
  const payload = await requestJson('/api/monitoring/snapshot', { signal });

  if (!payload || !payload.data) {
    const invalid = new Error('Monitoring snapshot returned an unexpected payload');
    invalid.kind = 'error';
    throw invalid;
  }

  return payload.data;
}
