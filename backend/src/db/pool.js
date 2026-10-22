import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool;

export function getPool() {
  if (!env.databaseUrl) {
    throw Object.assign(new Error('DATABASE_URL is not configured'), {
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
      max: 10,
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(work) {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await work({
      query: (text, params = []) => client.query(text, params),
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
