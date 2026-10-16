/**
 * AIPMS Unified Backend Process Supervisor for Render Free Tier (₹0 Deployment)
 * Launches all microservices locally within a single container.
 * Internal services bind to 127.0.0.1 on ports 3001-3009.
 * API Gateway binds to 0.0.0.0 on port 3000 as the public web endpoint.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const services = [
  { name: 'auth-service', dir: 'services/auth-service', port: 3001, maxOldSpace: 48 },
  { name: 'project-service', dir: 'services/project-service', port: 3002, maxOldSpace: 48 },
  { name: 'team-service', dir: 'services/team-service', port: 3003, maxOldSpace: 40 },
  { name: 'task-service', dir: 'services/task-service', port: 3004, maxOldSpace: 48 },
  { name: 'sprint-service', dir: 'services/sprint-service', port: 3005, maxOldSpace: 40 },
  { name: 'risk-service', dir: 'services/risk-service', port: 3006, maxOldSpace: 40 },
  { name: 'reporting-service', dir: 'services/reporting-service', port: 3007, maxOldSpace: 40 },
  { name: 'ai-service', dir: 'services/ai-service', port: 3009, maxOldSpace: 48 },
  { name: 'api-gateway', dir: 'services/api-gateway', port: 3000, maxOldSpace: 48 },
];

/** @type {Map<string, import('node:child_process').ChildProcess>} */
const runningProcesses = new Map();
/** @type {Map<string, number[]>} */
const restartTimestamps = new Map();
/** @type {Map<string, NodeJS.Timeout>} */
const pendingRestartTimers = new Map();

let isShuttingDown = false;
let forceExitTimer = null;

function log(service, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${service}] ${msg}`);
}

async function startService(svc) {
  if (isShuttingDown) {
    return;
  }

  const env = {
    ...process.env,
    PORT: String(svc.port),
    NODE_ENV: process.env.NODE_ENV || 'production',
    // Constrain libuv thread pool to 2 threads per child to reduce OS thread stack overhead (saves ~40-70MB total RSS across 9 processes)
    UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '2',
  };

  // Configure internal service URLs on the gateway
  if (svc.name === 'api-gateway') {
    env.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3001';
    env.PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://127.0.0.1:3002';
    env.TEAM_SERVICE_URL = process.env.TEAM_SERVICE_URL || 'http://127.0.0.1:3003';
    env.TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://127.0.0.1:3004';
    env.SPRINT_SERVICE_URL = process.env.SPRINT_SERVICE_URL || 'http://127.0.0.1:3005';
    env.RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || 'http://127.0.0.1:3006';
    env.REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://127.0.0.1:3007';
    env.AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:3009';
  }

  log('supervisor', `Starting ${svc.name} on port ${svc.port} (--max-old-space-size=${svc.maxOldSpace})...`);

  const scriptPath = fs.existsSync(path.join(svc.dir, 'dist', 'src', 'main.js'))
    ? 'dist/src/main.js'
    : 'dist/main.js';

  const cp = spawn('node', [`--max-old-space-size=${svc.maxOldSpace}`, scriptPath], {
    cwd: svc.dir,
    env,
    stdio: 'inherit',
  });

  runningProcesses.set(svc.name, cp);

  cp.on('exit', (code, signal) => {
    runningProcesses.delete(svc.name);
    log('supervisor', `${svc.name} exited with code ${code} (${signal ?? 'no signal'})`);

    if (isShuttingDown) {
      return;
    }

    if (code !== 0 && code !== null) {
      handleChildCrash(svc);
    }
  });

  cp.on('error', (err) => {
    log('supervisor', `Process error in ${svc.name}: ${err.message}`);
  });
}

function handleChildCrash(svc) {
  const now = Date.now();
  const history = (restartTimestamps.get(svc.name) || []).filter((t) => now - t < 60000);
  history.push(now);
  restartTimestamps.set(svc.name, history);

  if (history.length > 5) {
    log('supervisor', `CRITICAL: ${svc.name} crashed ${history.length} times in 60s. Cooling down for 30s...`);
    const timer = setTimeout(() => {
      pendingRestartTimers.delete(svc.name);
      if (!isShuttingDown) startService(svc);
    }, 30000);
    pendingRestartTimers.set(svc.name, timer);
    return;
  }

  const delayMs = Math.min(2000 * history.length, 10000);
  log('supervisor', `Restarting ${svc.name} in ${delayMs / 1000}s (failure #${history.length})...`);
  const timer = setTimeout(() => {
    pendingRestartTimers.delete(svc.name);
    if (!isShuttingDown) startService(svc);
  }, delayMs);
  pendingRestartTimers.set(svc.name, timer);
}

// Start internal microservices first, then API gateway
async function main() {
  log('supervisor', 'Starting AIPMS free-tier unified backend stack...');

  const domainServices = services.filter((s) => s.name !== 'api-gateway');
  const gateway = services.find((s) => s.name === 'api-gateway');

  for (const svc of domainServices) {
    await startService(svc);
    // Stagger startup slightly to reduce CPU spike during cold start
    await new Promise((r) => setTimeout(r, 600));
  }

  // Start gateway
  if (gateway) {
    await startService(gateway);
  }
  log('supervisor', 'All services initialized. Gateway is listening for traffic on port 3000.');
}

async function shutdown(signal) {
  if (isShuttingDown) {
    log('supervisor', `Forced exit on repeated signal ${signal}`);
    process.exit(1);
  }

  isShuttingDown = true;
  log('supervisor', `Received ${signal}, gracefully terminating all child services...`);

  // Clear all pending restart timers
  for (const [name, timer] of pendingRestartTimers.entries()) {
    clearTimeout(timer);
    pendingRestartTimers.delete(name);
  }

  const terminationPromises = [];

  for (const [name, cp] of runningProcesses.entries()) {
    const promise = new Promise((resolve) => {
      if (cp.killed || cp.exitCode !== null) {
        resolve();
        return;
      }

      const onExit = () => {
        resolve();
      };

      cp.once('exit', onExit);

      try {
        cp.kill(signal);
      } catch {
        resolve();
      }
    });

    terminationPromises.push(promise);
  }

  // Set timeout of 10 seconds for graceful termination
  const timeoutPromise = new Promise((resolve) => {
    forceExitTimer = setTimeout(() => {
      log('supervisor', 'Graceful shutdown timed out after 10s. Forcibly killing remaining child processes...');
      for (const [name, cp] of runningProcesses.entries()) {
        try {
          cp.kill('SIGKILL');
        } catch {
          // already dead
        }
      }
      resolve();
    }, 10000);
  });

  await Promise.race([Promise.all(terminationPromises), timeoutPromise]);

  if (forceExitTimer) {
    clearTimeout(forceExitTimer);
  }

  log('supervisor', 'All services terminated. Supervisor exiting cleanly.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  console.error('Fatal supervisor error:', err);
  process.exit(1);
});
