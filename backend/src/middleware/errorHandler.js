import { AppError } from '../errors/AppError.js';

const DATABASE_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  '28P01',
  '3D000',
  '57P03',
  '53300',
  '08001',
  '08006',
  'DATABASE_UNAVAILABLE',
]);

function isDatabaseError(err) {
  return Boolean(
    err?.code &&
      (DATABASE_CODES.has(err.code) ||
        err.code === 'ECONNRESET' ||
        err.message === 'DATABASE_URL is not configured'),
  );
}

function toSafeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  if (isDatabaseError(err)) {
    return new AppError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      details: [],
    },
  });
}

export function errorHandler(err, _req, res, _next) {
  const safe = toSafeError(err);

  if (!(err instanceof AppError)) {
    console.error('Request failed', {
      code: err.code || 'INTERNAL_ERROR',
      name: err.name,
    });
  }

  res.status(safe.status).json({
    error: {
      code: safe.code,
      message: safe.message,
      details: Array.isArray(safe.details) ? safe.details : [],
    },
  });
}
