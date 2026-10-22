CREATE TABLE IF NOT EXISTS sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
  temperature_c NUMERIC(6,2),
  vibration_mm_s NUMERIC(8,3),
  is_running BOOLEAN NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quality TEXT NOT NULL,
  CONSTRAINT sensor_readings_quality_check
    CHECK (quality IN ('fresh', 'stale', 'invalid', 'out_of_order')),
  CONSTRAINT sensor_readings_machine_recorded_unique UNIQUE (machine_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS sensor_readings_machine_recorded_idx
  ON sensor_readings (machine_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS sensor_readings_recorded_at_idx
  ON sensor_readings (recorded_at);
CREATE INDEX IF NOT EXISTS sensor_readings_quality_idx
  ON sensor_readings (quality);

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT alert_rules_metric_check
    CHECK (metric IN ('temperature_c', 'vibration_mm_s', 'stale_seconds')),
  CONSTRAINT alert_rules_operator_check
    CHECK (operator IN ('gt', 'gte', 'lt', 'lte')),
  CONSTRAINT alert_rules_severity_check
    CHECK (severity IN ('warning', 'critical')),
  CONSTRAINT alert_rules_unique UNIQUE (machine_id, metric, operator, threshold, severity)
);

CREATE INDEX IF NOT EXISTS alert_rules_machine_idx ON alert_rules (machine_id);
CREATE INDEX IF NOT EXISTS alert_rules_enabled_idx ON alert_rules (is_enabled);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines (id) ON DELETE CASCADE,
  alert_rule_id UUID NOT NULL REFERENCES alert_rules (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  triggered_value NUMERIC,
  triggered_at TIMESTAMPTZ NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT alerts_status_check CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

CREATE UNIQUE INDEX IF NOT EXISTS alerts_open_unique
  ON alerts (machine_id, alert_rule_id)
  WHERE status IN ('active', 'acknowledged');

CREATE INDEX IF NOT EXISTS alerts_machine_status_idx ON alerts (machine_id, status);
CREATE INDEX IF NOT EXISTS alerts_triggered_at_idx ON alerts (triggered_at DESC);
