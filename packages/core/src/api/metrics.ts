import { Request, Response } from 'express';
import axios from 'axios';
import { Node } from '../db/models/Node';
import { logger } from '../logger';
import { getContainerLoadMap } from '../scheduler/index';

interface WorkerStats {
  dockerId: string;
  cpuPercent: number;
  memoryMB: number;
}

export async function getMetrics(req: Request, res: Response) {
  const activeNodes = await Node.find({ status: 'active' });
  const loadMap = await getContainerLoadMap(activeNodes.map((n) => n._id));

  const results = await Promise.all(
    activeNodes.map(async (node) => {
      try {
        const response = await axios.get<{ stats: WorkerStats[] }>(
          `http://${node.host}:${node.port}/stats`,
          { timeout: 5_000 }
        );

        return {
          nodeId: node._id,
          host: node.host,
          port: node.port,
          containerCount: loadMap.get(String(node._id)) ?? 0,
          cpuPercent: node.cpuPercent,
          memoryMB: node.memoryMB,
          containers: response.data.stats,
        };
      } catch (err) {
        logger.warn(`Could not fetch metrics from ${node.host}:${node.port}`);
        return {
          nodeId: node._id,
          host: node.host,
          port: node.port,
          containerCount: loadMap.get(String(node._id)) ?? 0,
          cpuPercent: node.cpuPercent,
          memoryMB: node.memoryMB,
          containers: [],
          error: 'unreachable',
        };
      }
    })
  );

  return res.json({ metrics: results });
}
