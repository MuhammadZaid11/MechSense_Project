import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_ALERT_RULES } from '../config/demoLimits.js';
import { closePool, query } from './pool.js';

export const DEMO_MACHINES = [
  {
    code: 'MTR-01',
    name: '7.5 kW Induction Motor',
    machineType: 'motor',
    location: 'Pump House',
    status: 'running',
  },
  {
    code: 'PMP-01',
    name: 'Centrifugal Cooling Pump',
    machineType: 'pump',
    location: 'Cooling Area',
    status: 'stopped',
  },
  {
    code: 'CNV-01',
    name: 'Belt Conveyor',
    machineType: 'conveyor',
    location: 'Assembly Line',
    status: 'maintenance',
  },
];

export async function seedMachines() {
  for (const machine of DEMO_MACHINES) {
    const result = await query(
      `
        INSERT INTO machines (code, name, machine_type, location, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (code) DO NOTHING
      `,
      [machine.code, machine.name, machine.machineType, machine.location, machine.status],
    );

    if (result.rowCount === 0) {
      console.log(`skip ${machine.code} (already exists)`);
    } else {
      console.log(`seeded ${machine.code}`);
    }
  }
}

export async function seedAlertRules() {
  for (const rule of DEMO_ALERT_RULES) {
    const machine = await query('SELECT id FROM machines WHERE code = $1', [rule.machineCode]);
    if (!machine.rows[0]) {
      console.log(`skip rules for ${rule.machineCode} (machine missing)`);
      continue;
    }

    const result = await query(
      `
        INSERT INTO alert_rules (machine_id, metric, operator, threshold, severity)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (machine_id, metric, operator, threshold, severity) DO NOTHING
      `,
      [machine.rows[0].id, rule.metric, rule.operator, rule.threshold, rule.severity],
    );

    const label = `${rule.machineCode} ${rule.metric} ${rule.operator} ${rule.threshold} ${rule.severity}`;
    if (result.rowCount === 0) {
      console.log(`skip rule ${label}`);
    } else {
      console.log(`seeded rule ${label}`);
    }
  }
}

export async function seedAll() {
  await seedMachines();
  await seedAlertRules();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedAll()
    .then(async () => {
      await closePool();
    })
    .catch(async (error) => {
      console.error('Seed failed');
      console.error(error.message);
      await closePool().catch(() => {});
      process.exitCode = 1;
    });
}
