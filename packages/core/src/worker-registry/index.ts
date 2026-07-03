import { Request, Response } from 'express';
import { Node } from '../db/models/Node';
import { Event } from '../db/models/Event';
import { logger } from '../logger';

export async function handleRegister(req: Request, res: Response) {
  const { host, port } = req.body as { host: string; port: number };

  if (!host || !port) {
    return res.status(400).json({ error: 'host and port are required' });
  }

  const node = await Node.findOneAndUpdate(
    { host, port },
    {
      host,
      port,
      status: 'active',
      lastHeartbeat: new Date(),
      containerCount: 0,
    },
    { upsert: true, new: true }
  );

  await Event.create({
    type: 'node_registered',
    nodeId: node._id,
    message: `Worker node ${host}:${port} registered`,
    metadata: { host, port },
  });

  logger.info(`Worker registered: ${host}:${port} (id=${node._id})`);
  return res.json({ nodeId: node._id });
}

export async function handleHeartbeat(req: Request, res: Response) {
  const { nodeId, containerCount, cpuPercent, memoryMB } = req.body as {
    nodeId: string;
    containerCount: number;
    cpuPercent: number;
    memoryMB: number;
  };

  if (!nodeId) {
    return res.status(400).json({ error: 'nodeId is required' });
  }

  const node = await Node.findByIdAndUpdate(
    nodeId,
    {
      lastHeartbeat: new Date(),
      containerCount,
      cpuPercent,
      memoryMB,
      status: 'active',
    },
    { new: true }
  );

  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }

  return res.json({ ok: true });
}
