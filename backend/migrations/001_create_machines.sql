CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT machines_code_unique UNIQUE (code),
  CONSTRAINT machines_type_check CHECK (machine_type IN ('motor', 'pump', 'conveyor')),
  CONSTRAINT machines_status_check CHECK (status IN ('running', 'stopped', 'maintenance'))
);

CREATE INDEX IF NOT EXISTS machines_status_idx ON machines (status);
CREATE INDEX IF NOT EXISTS machines_machine_type_idx ON machines (machine_type);
CREATE INDEX IF NOT EXISTS machines_created_at_idx ON machines (created_at);
