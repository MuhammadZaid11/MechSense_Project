import { env } from '../config/env.js';

export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: env.serviceName,
    version: env.version,
    timestamp: new Date().toISOString(),
  });
}
