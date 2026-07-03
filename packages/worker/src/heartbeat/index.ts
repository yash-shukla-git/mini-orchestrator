import axios from 'axios';
import { docker } from '../docker/client';
import { config } from '../config';
import { logger } from '../logger';
import { getContainerStats } from '../docker/stats';

const HEARTBEAT_INTERVAL_MS = 10_000;

export function startHeartbeat(nodeId: string) {
  logger.info(`Heartbeat started for node ${nodeId}`);

  setInterval(async () => {
    try {
      const containers = await docker.listContainers({ all: false });

      let totalCpu = 0;
      let totalMemory = 0;

      for (const c of containers) {
        try {
          const stats = await getContainerStats(c.Id);
          totalCpu += stats.cpuPercent;
          totalMemory += stats.memoryMB;
        } catch {
          // skip containers that aren't responding to stats
        }
      }

      await axios.post(
        `${config.controlPlaneUrl}/worker/heartbeat`,
        {
          nodeId,
          containerCount: containers.length,
          cpuPercent: Math.round(totalCpu * 100) / 100,
          memoryMB: Math.round(totalMemory * 100) / 100,
        },
        { timeout: 5_000 }
      );
    } catch (err) {
      logger.warn(`Heartbeat failed: ${(err as Error).message}`);
    }
  }, HEARTBEAT_INTERVAL_MS);
}
