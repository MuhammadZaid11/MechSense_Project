import { env } from '../config/env.js';

export function createMonitoringService({ machineService, readingService, alertService, getSimulatorStatus }) {
  return {
    async getSnapshot() {
      const [machines, latestReadings, openAlerts] = await Promise.all([
        machineService.listMachines(),
        readingService.listLatestReadings(),
        alertService.listOpenAlerts(),
      ]);

      const latestByMachine = new Map(latestReadings.map((reading) => [reading.machineId, reading]));
      const counts = new Map();
      for (const alert of openAlerts) {
        counts.set(alert.machineId, (counts.get(alert.machineId) || 0) + 1);
      }

      return {
        disclaimer:
          'Demo thresholds are configurable teaching values, not industrial safety limits.',
        simulator: getSimulatorStatus(),
        staleAfterSeconds: env.staleAfterSeconds,
        machines: machines.map((machine) => ({
          ...machine,
          latestReading: latestByMachine.get(machine.id) ?? null,
          openAlertCount: counts.get(machine.id) || 0,
        })),
        openAlerts,
      };
    },
  };
}
