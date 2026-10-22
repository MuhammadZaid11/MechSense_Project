import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import { withTransaction } from '../db/pool.js';
import { isUuid } from '../validators/uuid.js';
import { parseLimit, parseOptionalNumber, parseRecordedAt, parseRequiredBoolean } from '../validators/reading.js';
import { evaluateReadingQuality } from './readingQuality.js';
import { mapReading } from './mappers.js';
import { createAlertEngine } from './alertEngine.js';

function requireUuid(id) {
  if (!isUuid(id)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'id must be a valid UUID', [
      { field: 'id', reason: 'invalid_uuid' },
    ]);
  }
}

export function createReadingService({ query, withTxn = withTransaction }) {
  async function machineExists(exec, machineId) {
    const result = await exec.query('SELECT id FROM machines WHERE id = $1', [machineId]);
    return Boolean(result.rows[0]);
  }

  return {
    async ingestReading(machineId, body) {
      requireUuid(machineId);

      const temperatureC = parseOptionalNumber(body.temperatureC, 'temperatureC');
      const vibrationMmS = parseOptionalNumber(body.vibrationMmS, 'vibrationMmS');
      const isRunning = parseRequiredBoolean(body.isRunning, 'isRunning');
      const recordedAt = parseRecordedAt(body.recordedAt);
      const ingestedAt = new Date();

      return withTxn(async (tx) => {
        if (!(await machineExists(tx, machineId))) {
          throw new AppError(404, 'NOT_FOUND', 'Machine not found', [
            { field: 'id', reason: 'not_found' },
          ]);
        }

        const latest = await tx.query(
          `
            SELECT recorded_at
            FROM sensor_readings
            WHERE machine_id = $1
            ORDER BY recorded_at DESC
            LIMIT 1
          `,
          [machineId],
        );

        const quality = evaluateReadingQuality({
          temperatureC,
          vibrationMmS,
          recordedAt,
          ingestedAt,
          latestRecordedAt: latest.rows[0] ? new Date(latest.rows[0].recorded_at) : null,
          staleAfterSeconds: env.staleAfterSeconds,
        });

        let inserted;
        try {
          inserted = await tx.query(
            `
              INSERT INTO sensor_readings (
                machine_id, temperature_c, vibration_mm_s, is_running,
                recorded_at, ingested_at, quality
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              RETURNING id, machine_id, temperature_c, vibration_mm_s, is_running,
                        recorded_at, ingested_at, quality
            `,
            [machineId, temperatureC, vibrationMmS, isRunning, recordedAt, ingestedAt, quality],
          );
        } catch (error) {
          if (error.code === '23505') {
            throw new AppError(
              409,
              'CONFLICT',
              'A reading with this recordedAt already exists for the machine',
              [{ field: 'recordedAt', reason: 'duplicate' }],
            );
          }
          throw error;
        }

        const reading = mapReading(inserted.rows[0]);
        const alerts = await createAlertEngine({ query: tx.query }).evaluateReading({
          machineId,
          reading,
          now: ingestedAt,
        });

        return { reading, alerts };
      });
    },

    async listReadings(machineId, limitValue) {
      requireUuid(machineId);
      const limit = parseLimit(limitValue);

      if (!(await machineExists({ query }, machineId))) {
        throw new AppError(404, 'NOT_FOUND', 'Machine not found', [
          { field: 'id', reason: 'not_found' },
        ]);
      }

      const result = await query(
        `
          SELECT id, machine_id, temperature_c, vibration_mm_s, is_running,
                 recorded_at, ingested_at, quality
          FROM sensor_readings
          WHERE machine_id = $1
          ORDER BY recorded_at DESC
          LIMIT $2
        `,
        [machineId, limit],
      );

      return result.rows.map(mapReading);
    },

    async listLatestReadings() {
      const result = await query(
        `
          SELECT DISTINCT ON (r.machine_id)
            r.id, r.machine_id, m.code AS machine_code, r.temperature_c,
            r.vibration_mm_s, r.is_running, r.recorded_at, r.ingested_at, r.quality
          FROM sensor_readings r
          JOIN machines m ON m.id = r.machine_id
          ORDER BY r.machine_id, r.recorded_at DESC, r.ingested_at DESC
        `,
      );

      return result.rows.map(mapReading);
    },
  };
}
