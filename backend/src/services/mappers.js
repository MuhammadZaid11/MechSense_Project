function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function mapReading(row) {
  return {
    id: Number(row.id),
    machineId: row.machine_id,
    machineCode: row.machine_code ?? null,
    temperatureC: toNumber(row.temperature_c),
    vibrationMmS: toNumber(row.vibration_mm_s),
    isRunning: row.is_running,
    recordedAt: toIso(row.recorded_at),
    ingestedAt: toIso(row.ingested_at),
    quality: row.quality,
  };
}

export function mapAlertRule(row) {
  return {
    id: row.id,
    machineId: row.machine_id,
    metric: row.metric,
    operator: row.operator,
    threshold: toNumber(row.threshold),
    severity: row.severity,
    isEnabled: row.is_enabled,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapAlert(row) {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineCode: row.machine_code ?? null,
    alertRuleId: row.alert_rule_id,
    metric: row.metric ?? null,
    severity: row.severity ?? row.rule_severity ?? null,
    status: row.status,
    message: row.message,
    triggeredValue: toNumber(row.triggered_value),
    triggeredAt: toIso(row.triggered_at),
    acknowledgedAt: toIso(row.acknowledged_at),
    acknowledgedBy: row.acknowledged_by,
    resolvedAt: toIso(row.resolved_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}
