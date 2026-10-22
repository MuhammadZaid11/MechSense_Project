import { DEMO_LIMITS } from '../config/demoLimits.js';

function isOutOfRange(value, min, max) {
  return value < min || value > max;
}

export function evaluateReadingQuality({
  temperatureC,
  vibrationMmS,
  recordedAt,
  ingestedAt,
  latestRecordedAt,
  staleAfterSeconds,
}) {
  const missing =
    temperatureC === null ||
    temperatureC === undefined ||
    vibrationMmS === null ||
    vibrationMmS === undefined;

  const invalidRange =
    !missing &&
    (isOutOfRange(temperatureC, DEMO_LIMITS.temperatureMinC, DEMO_LIMITS.temperatureMaxC) ||
      isOutOfRange(vibrationMmS, DEMO_LIMITS.vibrationMinMmS, DEMO_LIMITS.vibrationMaxMmS));

  const futureSkewSeconds = (recordedAt.getTime() - ingestedAt.getTime()) / 1000;
  if (missing || invalidRange || futureSkewSeconds > DEMO_LIMITS.futureSkewSeconds) {
    return 'invalid';
  }

  if (latestRecordedAt && recordedAt.getTime() < latestRecordedAt.getTime()) {
    return 'out_of_order';
  }

  const ageSeconds = (ingestedAt.getTime() - recordedAt.getTime()) / 1000;
  if (ageSeconds > staleAfterSeconds) {
    return 'stale';
  }

  return 'fresh';
}

export function compareThreshold(value, operator, threshold) {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'gte':
      return value >= threshold;
    case 'lt':
      return value < threshold;
    case 'lte':
      return value <= threshold;
    default:
      return false;
  }
}

export function isRuleTriggered(rule, { reading, now, lastFreshAt, lastIngestedAt }) {
  const threshold = Number(rule.threshold);

  if (rule.metric === 'stale_seconds') {
    const reference = lastFreshAt || lastIngestedAt;
    if (!reference) {
      return false;
    }

    const ageSeconds = (now.getTime() - reference.getTime()) / 1000;
    return compareThreshold(ageSeconds, rule.operator, threshold);
  }

  if (reading.quality === 'invalid' || reading.quality === 'out_of_order') {
    return false;
  }

  const value = rule.metric === 'temperature_c' ? reading.temperatureC : reading.vibrationMmS;
  if (value === null || value === undefined) {
    return false;
  }

  return compareThreshold(value, rule.operator, threshold);
}

export function alertMessage(rule, value) {
  const metricLabels = {
    temperature_c: 'temperature',
    vibration_mm_s: 'vibration',
    stale_seconds: 'reading freshness',
  };
  const units = {
    temperature_c: '°C',
    vibration_mm_s: ' mm/s',
    stale_seconds: 's',
  };

  return `Demo ${rule.severity} ${metricLabels[rule.metric]} rule: ${rule.operator} ${rule.threshold}${units[rule.metric]} (observed ${value}${units[rule.metric]}). Teaching threshold only.`;
}
