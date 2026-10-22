import { createApp } from './app.js';
import { env } from './config/env.js';
import { query } from './db/pool.js';
import { createMachineService } from './services/machineService.js';
import { createReadingService } from './services/readingService.js';
import { configureSimulator, startSimulator, stopSimulator } from './services/simulator.js';

const machineService = createMachineService({ query });
const readingService = createReadingService({ query });

configureSimulator({ machineService, readingService });

const app = createApp({ machineService, readingService });

const server = app.listen(env.port, () => {
  console.log(`${env.serviceName} listening on http://localhost:${env.port}`);

  if (env.simulatorEnabled) {
    const status = startSimulator();
    console.log(
      `Simulator enabled (interval ${status.intervalMs} ms). Software demo only; not a safety system.`,
    );
  }
});

function shutdown() {
  stopSimulator();
  server.close(() => {
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
