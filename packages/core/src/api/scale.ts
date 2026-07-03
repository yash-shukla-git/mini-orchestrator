import { Request, Response } from 'express';
import { Container } from '../db/models/Container';
import { Node } from '../db/models/Node';
import { Event } from '../db/models/Event';
import { pickNode } from '../scheduler/index';
import { dispatchRun, dispatchKill } from '../scheduler/dispatch';
import { logger } from '../logger';

export async function handleScale(req: Request, res: Response) {
  const { name, replicas } = req.body as { name: string; replicas: number };

  if (!name || replicas == null) {
    return res.status(400).json({ error: 'name and replicas are required' });
  }

  if (replicas < 0 || replicas > 20) {
    return res.status(400).json({ error: 'replicas must be between 0 and 20' });
  }

  const running = await Container.find({ groupName: name, status: 'running' }).sort({ replicaIndex: 1 });
  const current = running.length;

  if (current === replicas) {
    return res.json({ message: `Already at ${replicas} replicas`, current });
  }

  if (replicas > current) {
    const toAdd = replicas - current;
    const maxIndex = running.length > 0 ? Math.max(...running.map((c) => c.replicaIndex)) : 0;
    const added = [];

    for (let i = 0; i < toAdd; i++) {
      const replicaIndex = maxIndex + i + 1;
      const containerName = `${name}_${replicaIndex}`;
      const image = running[0]?.image;

      if (!image) {
        return res.status(400).json({ error: `No existing containers for "${name}" to infer image from` });
      }

      try {
        const node = await pickNode();
        await dispatchRun(node, image, containerName);

        const container = await Container.create({
          name: containerName,
          image,
          groupName: name,
          replicaIndex,
          nodeId: node._id,
          status: 'pending',
        });

        await Event.create({
          type: 'scale_up',
          containerId: container._id,
          nodeId: node._id,
          message: `Scaling up ${name} → dispatched ${containerName} to ${node.host}:${node.port}`,
          metadata: { targetReplicas: replicas },
        });

        added.push(containerName);
      } catch (err) {
        logger.error(`Scale up failed for ${containerName}: ${(err as Error).message}`);
        return res.status(503).json({ error: (err as Error).message, added });
      }
    }

    return res.json({ scaled: 'up', from: current, to: replicas, added });
  }

  // Scale down — kill highest-index containers first
  const toRemove = running.slice(replicas).reverse();
  const removed = [];

  for (const container of toRemove) {
    const node = await Node.findById(container.nodeId);

    if (node) {
      try {
        await dispatchKill(node, container.dockerId);
      } catch {
        logger.warn(`Could not reach node to kill ${container.name}, marking stopped`);
      }
    }

    await Container.findByIdAndUpdate(container._id, { status: 'stopped', stoppedAt: new Date() });

    await Event.create({
      type: 'scale_down',
      containerId: container._id,
      nodeId: container.nodeId,
      message: `Scaled down ${name} → removed ${container.name}`,
      metadata: { targetReplicas: replicas },
    });

    removed.push(container.name);
  }

  return res.json({ scaled: 'down', from: current, to: replicas, removed });
}
