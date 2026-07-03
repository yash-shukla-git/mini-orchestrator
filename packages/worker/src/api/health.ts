import { Request, Response } from 'express';
import { docker } from '../docker/client';

let nodeId: string | null = null;

export function setNodeId(id: string) {
  nodeId = id;
}

export async function handleHealth(_req: Request, res: Response) {
  const containers = await docker.listContainers({ all: true });

  return res.json({
    nodeId,
    containers: containers.map((c) => ({
      dockerId: c.Id,
      name: c.Names[0]?.replace(/^\//, '') ?? '',
      status: c.Status,
      running: c.State === 'running',
    })),
  });
}
