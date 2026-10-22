import { AppError } from '../errors/AppError.js';

function invalid(message, field, reason) {
  return new AppError(400, 'VALIDATION_ERROR', message, [{ field, reason }]);
}

export function parseOptionalNumber(value, field) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid(`${field} must be a finite number or null`, field, 'not_finite');
  }

  return value;
}

export function parseRequiredBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw invalid(`${field} must be a boolean`, field, 'not_boolean');
  }

  return value;
}

export function parseRecordedAt(value) {
  if (value === undefined || value === null || value === '') {
    return new Date();
  }

  if (typeof value !== 'string') {
    throw invalid('recordedAt must be an ISO-8601 timestamp', 'recordedAt', 'invalid_datetime');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalid('recordedAt must be an ISO-8601 timestamp', 'recordedAt', 'invalid_datetime');
  }

  return parsed;
}

export function parseLimit(value, fallback = 50, max = 200) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw invalid(`limit must be an integer between 1 and ${max}`, 'limit', 'out_of_range');
  }

  return parsed;
}

export function parseAlertStatus(value) {
  if (value === undefined || value === '') {
    return null;
  }

  if (!['active', 'acknowledged', 'resolved'].includes(value)) {
    throw invalid('status must be active, acknowledged, or resolved', 'status', 'invalid_enum');
  }

  return value;
}
