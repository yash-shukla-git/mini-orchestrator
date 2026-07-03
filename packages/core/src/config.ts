import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  mongoUri: process.env.MONGODB_URI || '',
  healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '10000'),
  nodeLostThresholdMs: parseInt(process.env.NODE_LOST_THRESHOLD_MS || '30000'),
  maxRestartCount: parseInt(process.env.MAX_RESTART_COUNT || '5'),
};
