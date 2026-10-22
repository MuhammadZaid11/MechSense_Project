// Configurable demo limits. These are teaching defaults, not certified
// industrial safety, ISO, or OEM trip settings.

export const DEMO_LIMITS = {
  temperatureMinC: -20,
  temperatureMaxC: 200,
  vibrationMinMmS: 0,
  vibrationMaxMmS: 50,
  futureSkewSeconds: 60,
};

export const DEMO_ALERT_RULES = [
  { machineCode: 'MTR-01', metric: 'temperature_c', operator: 'gt', threshold: 70, severity: 'warning' },
  { machineCode: 'MTR-01', metric: 'temperature_c', operator: 'gt', threshold: 85, severity: 'critical' },
  { machineCode: 'MTR-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 4.5, severity: 'warning' },
  { machineCode: 'MTR-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 7.1, severity: 'critical' },
  { machineCode: 'MTR-01', metric: 'stale_seconds', operator: 'gt', threshold: 30, severity: 'warning' },
  { machineCode: 'PMP-01', metric: 'temperature_c', operator: 'gt', threshold: 65, severity: 'warning' },
  { machineCode: 'PMP-01', metric: 'temperature_c', operator: 'gt', threshold: 80, severity: 'critical' },
  { machineCode: 'PMP-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 4.0, severity: 'warning' },
  { machineCode: 'PMP-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 6.5, severity: 'critical' },
  { machineCode: 'PMP-01', metric: 'stale_seconds', operator: 'gt', threshold: 30, severity: 'warning' },
  { machineCode: 'CNV-01', metric: 'temperature_c', operator: 'gt', threshold: 55, severity: 'warning' },
  { machineCode: 'CNV-01', metric: 'temperature_c', operator: 'gt', threshold: 70, severity: 'critical' },
  { machineCode: 'CNV-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 3.5, severity: 'warning' },
  { machineCode: 'CNV-01', metric: 'vibration_mm_s', operator: 'gt', threshold: 6.0, severity: 'critical' },
  { machineCode: 'CNV-01', metric: 'stale_seconds', operator: 'gt', threshold: 30, severity: 'warning' },
];
