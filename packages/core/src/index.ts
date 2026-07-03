import express from 'express';
import { config } from './config';
import { connectDB } from './db/connection';
import { startHealthLoop } from './health/loop';
import router from './api/router';
import { logger } from './logger';

const app = express();
app.use(express.json());
app.use(router);

async function start() {
  await connectDB();

  app.listen(config.port, () => {
    logger.info(`Control plane running on port ${config.port}`);
  });

  startHealthLoop();
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
