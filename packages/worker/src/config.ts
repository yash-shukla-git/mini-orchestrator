import 'dotenv/config';

export const config = {
  workerPort: parseInt(process.env.WORKER_PORT || '3001'),
  workerHost: process.env.WORKER_HOST || 'localhost',
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:3000',
};
