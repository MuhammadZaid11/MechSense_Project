import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  port: parsePort(process.env.PORT, 3001),
  nodeEnv,
  serviceName: 'mechsense-api',
  version: '1.0.0-phase3',
  databaseUrl: process.env.DATABASE_URL || '',
  staleAfterSeconds: parsePort(process.env.STALE_AFTER_SECONDS, 30),
  simulatorEnabled: parseBoolean(process.env.SIMULATOR_ENABLED, nodeEnv !== 'test'),
  simulatorIntervalMs: parsePort(process.env.SIMULATOR_INTERVAL_MS, 5000),
};
