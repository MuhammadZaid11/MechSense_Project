import express from 'express';
import { query } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createMachinesRouter } from './routes/machines.js';
import { createReadingsRouter } from './routes/readings.js';
import { createAlertsRouter } from './routes/alerts.js';
import { createMonitoringRouter } from './routes/monitoring.js';
import healthRouter from './routes/health.js';
import { createMachineService } from './services/machineService.js';
import { createReadingService } from './services/readingService.js';
import { createAlertService } from './services/alertService.js';
import { createMonitoringService } from './services/monitoringService.js';
import { getSimulatorStatus, startSimulator, stopSimulator } from './services/simulator.js';

export function createApp({
  machineService,
  readingService,
  alertService,
  monitoringService,
  simulatorStatus,
  simulatorControls,
} = {}) {
  const app = express();
  const machines = machineService ?? createMachineService({ query });
  const readings = readingService ?? createReadingService({ query });
  const alerts = alertService ?? createAlertService({ query });
  const statusFn = simulatorStatus ?? getSimulatorStatus;
  const controls = simulatorControls ?? {
    getStatus: statusFn,
    start: () => startSimulator(),
    stop: () => stopSimulator(),
  };
  const monitoring =
    monitoringService ??
    createMonitoringService({
      machineService: machines,
      readingService: readings,
      alertService: alerts,
      getSimulatorStatus: statusFn,
    });

  app.use(express.json({ limit: '32kb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  app.use('/api', healthRouter);
  app.use('/api', createMachinesRouter(machines));
  app.use('/api', createReadingsRouter(readings));
  app.use('/api', createAlertsRouter(alerts));
  app.use('/api', createMonitoringRouter(monitoring, controls));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
