import { alertMessage, isRuleTriggered } from './readingQuality.js';
import { mapAlert, mapAlertRule } from './mappers.js';

async function latestTimestamps(query, machineId) {
  const fresh = await query(
    `
      SELECT recorded_at, ingested_at
      FROM sensor_readings
      WHERE machine_id = $1 AND quality = 'fresh'
      ORDER BY recorded_at DESC
      LIMIT 1
    `,
    [machineId],
  );
  const any = await query(
    `
      SELECT ingested_at
      FROM sensor_readings
      WHERE machine_id = $1
      ORDER BY ingested_at DESC
      LIMIT 1
    `,
    [machineId],
  );

  return {
    lastFreshAt: fresh.rows[0]?.recorded_at ? new Date(fresh.rows[0].recorded_at) : null,
    lastIngestedAt: any.rows[0]?.ingested_at ? new Date(any.rows[0].ingested_at) : null,
  };
}

async function listEnabledRules(query, machineId) {
  const result = await query(
    `
      SELECT id, machine_id, metric, operator, threshold, severity, is_enabled, created_at, updated_at
      FROM alert_rules
      WHERE machine_id = $1 AND is_enabled = true
    `,
    [machineId],
  );

  return result.rows.map(mapAlertRule);
}

async function openAlert(query, { machineId, rule, value, triggeredAt }) {
  const inserted = await query(
    `
      INSERT INTO alerts (
        machine_id, alert_rule_id, status, message, triggered_value, triggered_at
      )
      VALUES ($1, $2, 'active', $3, $4, $5)
      ON CONFLICT (machine_id, alert_rule_id) WHERE status IN ('active', 'acknowledged')
      DO NOTHING
      RETURNING id, machine_id, alert_rule_id, status, message, triggered_value,
                triggered_at, acknowledged_at, acknowledged_by, resolved_at, created_at, updated_at
    `,
    [machineId, rule.id, alertMessage(rule, value), value, triggeredAt],
  );

  if (inserted.rows[0]) {
    return mapAlert({ ...inserted.rows[0], metric: rule.metric, severity: rule.severity });
  }

  return null;
}

async function resolveOpenAlert(query, { machineId, ruleId, resolvedAt }) {
  await query(
    `
      UPDATE alerts
      SET status = 'resolved',
          resolved_at = $3,
          updated_at = $3
      WHERE machine_id = $1
        AND alert_rule_id = $2
        AND status IN ('active', 'acknowledged')
    `,
    [machineId, ruleId, resolvedAt],
  );
}

function observedValue(rule, reading, now, lastFreshAt, lastIngestedAt) {
  if (rule.metric === 'stale_seconds') {
    const reference = lastFreshAt || lastIngestedAt;
    return reference ? Number(((now.getTime() - reference.getTime()) / 1000).toFixed(1)) : null;
  }

  return rule.metric === 'temperature_c' ? reading.temperatureC : reading.vibrationMmS;
}

export function createAlertEngine({ query }) {
  return {
    async evaluateReading({ machineId, reading, now = new Date() }) {
      const rules = await listEnabledRules(query, machineId);
      const timestamps = await latestTimestamps(query, machineId);
      const changed = [];

      for (const rule of rules) {
        const triggered = isRuleTriggered(rule, {
          reading,
          now,
          lastFreshAt: timestamps.lastFreshAt,
          lastIngestedAt: timestamps.lastIngestedAt,
        });
        const value = observedValue(
          rule,
          reading,
          now,
          timestamps.lastFreshAt,
          timestamps.lastIngestedAt,
        );

        if (triggered) {
          const opened = await openAlert(query, {
            machineId,
            rule,
            value,
            triggeredAt: now,
          });
          if (opened) {
            changed.push(opened);
          }
        } else if (reading.quality === 'fresh' || rule.metric === 'stale_seconds') {
          await resolveOpenAlert(query, {
            machineId,
            ruleId: rule.id,
            resolvedAt: now,
          });
        }
      }

      return changed;
    },
  };
}
