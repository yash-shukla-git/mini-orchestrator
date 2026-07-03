import express from 'express';
import axios from 'axios';
import { config } from './config';
import router from './api/router';
import { setNodeId } from './api/health';
import { startHeartbeat } from './heartbeat/index';
import { logger } from './logger';

const app = express();
app.use(express.json());
app.use(router);

async function register(attempt = 1): Promise<string> {
  try {
    const response = await axios.post<{ nodeId: string }>(
      `${config.controlPlaneUrl}/worker/register`,
      { host: config.workerHost, port: config.workerPort },
      { timeout: 5_000 }
    );
    return response.data.nodeId;
  } catch (err) {
    if (attempt >= 3) {
      throw new Error(`Could not register with control plane after ${attempt} attempts: ${(err as Error).message}`);
    }
    const delay = attempt * 2000;
    logger.warn(`Registration attempt ${attempt} failed, retrying in ${delay / 1000}s...`);
    await new Promise((r) => setTimeout(r, delay));
    return register(attempt + 1);
  }
}

async function start() {
  app.listen(config.workerPort, async () => {
    logger.info(`Worker listening on port ${config.workerPort}`);

    try {
      const nodeId = await register();
      setNodeId(nodeId);
      logger.info(`Registered with control plane as node ${nodeId}`);
      startHeartbeat(nodeId);
    } catch (err) {
      logger.error((err as Error).message);
      process.exit(1);
    }
  });
}

start().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
