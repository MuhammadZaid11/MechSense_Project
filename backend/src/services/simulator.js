import { env } from '../config/env.js';

const PROFILES = {
  motor: { temp: 62, tempJitter: 3.5, vib: 3.1, vibJitter: 0.5, spikeTemp: 88, spikeVib: 7.5 },
  pump: { temp: 54, tempJitter: 3, vib: 2.7, vibJitter: 0.4, spikeTemp: 82, spikeVib: 6.8 },
  conveyor: { temp: 40, tempJitter: 2.5, vib: 2.3, vibJitter: 0.35, spikeTemp: 72, spikeVib: 6.3 },
};

function jitter(base, spread) {
  return Number((base + (Math.random() * 2 - 1) * spread).toFixed(2));
}

export function generateSimulatedReading(machine, tick, now = new Date()) {
  const profile = PROFILES[machine.machineType] || PROFILES.motor;
  const idle = machine.status !== 'running';
  const spike = !idle && tick > 0 && tick % 12 === 0;
  const dropMetric = tick > 0 && tick % 17 === 0;
  const invalidRange = tick > 0 && tick % 23 === 0;
  const outOfOrder = tick > 0 && tick % 19 === 0;
  const staleStamp = tick > 0 && tick % 29 === 0;

  let temperatureC = idle ? jitter(profile.temp - 12, 2) : jitter(profile.temp, profile.tempJitter);
  let vibrationMmS = idle ? jitter(0.4, 0.15) : jitter(profile.vib, profile.vibJitter);

  if (spike) {
    temperatureC = profile.spikeTemp;
    vibrationMmS = profile.spikeVib;
  }

  if (invalidRange) {
    temperatureC = 240;
  }

  if (dropMetric) {
    temperatureC = null;
  }

  let recordedAt = now;
  if (outOfOrder) {
    recordedAt = new Date(now.getTime() - 120_000);
  } else if (staleStamp) {
    recordedAt = new Date(now.getTime() - (env.staleAfterSeconds + 15) * 1000);
  }

  return {
    temperatureC,
    vibrationMmS: Number.isFinite(vibrationMmS) ? Number(vibrationMmS.toFixed(3)) : vibrationMmS,
    isRunning: !idle,
    recordedAt: recordedAt.toISOString(),
  };
}

const simulatorState = {
  enabled: false,
  intervalMs: env.simulatorIntervalMs,
  lastTickAt: null,
  tickCount: 0,
  timer: null,
};

let simulatorDeps = null;
let shutdownRegistered = false;

function registerShutdownHooks() {
  if (shutdownRegistered) {
    return;
  }

  shutdownRegistered = true;
  const halt = () => {
    stopSimulator();
  };

  process.once('SIGINT', halt);
  process.once('SIGTERM', halt);
}

export function configureSimulator(deps) {
  simulatorDeps = deps;
}

export function getSimulatorStatus() {
  return {
    enabled: simulatorState.enabled,
    intervalMs: simulatorState.intervalMs,
    lastTickAt: simulatorState.lastTickAt,
    tickCount: simulatorState.tickCount,
  };
}

export function startSimulator(deps = simulatorDeps) {
  if (deps) {
    simulatorDeps = deps;
  }

  if (!simulatorDeps?.machineService || !simulatorDeps?.readingService) {
    throw new Error('Simulator is not configured');
  }

  if (simulatorState.timer) {
    return getSimulatorStatus();
  }

  registerShutdownHooks();
  simulatorState.enabled = true;
  simulatorState.intervalMs = env.simulatorIntervalMs;

  const tick = async () => {
    simulatorState.tickCount += 1;
    simulatorState.lastTickAt = new Date().toISOString();

    try {
      const machines = await simulatorDeps.machineService.listMachines();
      for (const machine of machines) {
        const sample = generateSimulatedReading(machine, simulatorState.tickCount);
        try {
          await simulatorDeps.readingService.ingestReading(machine.id, sample);
        } catch (error) {
          if (error.code !== 'CONFLICT') {
            console.error('Simulator ingest failed', { code: error.code, machine: machine.code });
          }
        }
      }
    } catch (error) {
      console.error('Simulator tick failed', { code: error.code || 'INTERNAL_ERROR' });
    }
  };

  simulatorState.timer = setInterval(tick, simulatorState.intervalMs);
  if (typeof simulatorState.timer.unref === 'function') {
    simulatorState.timer.unref();
  }

  tick();
  return getSimulatorStatus();
}

export function stopSimulator() {
  if (simulatorState.timer) {
    clearInterval(simulatorState.timer);
    simulatorState.timer = null;
  }
  simulatorState.enabled = false;
  return getSimulatorStatus();
}
