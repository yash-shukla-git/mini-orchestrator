import axios from 'axios';
import { docker } from '../docker/client';
import { config } from '../config';
import { logger } from '../logger';
import { getContainerStats } from '../docker/stats';
import { ownContainerFilter } from '../docker/labels';

const HEARTBEAT_INTERVAL_MS = 10_000;

export function startHeartbeat(nodeId: string) {
  logger.info(`Heartbeat started for node ${nodeId}`);

  setInterval(async () => {
    try {
      const containers = await docker.listContainers({ all: false, filters: ownContainerFilter() });

      const allStats = await Promise.all(
        containers.map((c) =>
          getContainerStats(c.Id).catch(() => null) // skip containers that aren't responding to stats
        )
      );

      let totalMemory = 0;

      for (const stats of allStats) {
        if (!stats) continue;
        totalMemory += stats.memoryMB;
      }

      await axios.post(
        `${config.controlPlaneUrl}/worker/heartbeat`,
        {
          nodeId,
          memoryMB: Math.round(totalMemory * 100) / 100,
        },
        { timeout: 5_000 }
      );
    } catch (err) {
      logger.warn(`Heartbeat failed: ${(err as Error).message}`);
    }
  }, HEARTBEAT_INTERVAL_MS);
}
