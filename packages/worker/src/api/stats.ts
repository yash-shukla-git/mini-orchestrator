import { Request, Response } from 'express';
import { docker } from '../docker/client';
import { getContainerStats } from '../docker/stats';
import { logger } from '../logger';

export async function handleStats(_req: Request, res: Response) {
  const containers = await docker.listContainers({ all: false });

  const results = await Promise.all(
    containers.map(async (c) => {
      try {
        return await getContainerStats(c.Id);
      } catch (err) {
        logger.warn(`Stats unavailable for ${c.Id.slice(0, 12)}: ${(err as Error).message}`);
        return { dockerId: c.Id, cpuPercent: 0, memoryMB: 0 };
      }
    })
  );

  return res.json({ stats: results });
}
