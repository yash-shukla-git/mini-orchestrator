import { Request, Response } from 'express';
import { pickNode } from '../scheduler/index';
import { dispatchRun } from '../scheduler/dispatch';
import { Container } from '../db/models/Container';
import { Event } from '../db/models/Event';
import { logger } from '../logger';

export async function handleDeploy(req: Request, res: Response) {
  const { image, name, replicas = 1 } = req.body as {
    image: string;
    name: string;
    replicas?: number;
  };

  if (!image || !name) {
    return res.status(400).json({ error: 'image and name are required' });
  }

  if (replicas < 1 || replicas > 20) {
    return res.status(400).json({ error: 'replicas must be between 1 and 20' });
  }

  // Find the highest existing replica index for this group so we don't reset numbering on re-deploy
  const existing = await Container.find({ groupName: name }).sort({ replicaIndex: -1 }).limit(1);
  const startIndex = existing.length > 0 ? existing[0].replicaIndex + 1 : 1;

  const deployed = [];

  for (let i = 0; i < replicas; i++) {
    const replicaIndex = startIndex + i;
    const containerName = `${name}_${replicaIndex}`;

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
        type: 'deployed',
        containerId: container._id,
        nodeId: node._id,
        message: `Dispatching ${containerName} on ${node.host}:${node.port}`,
        metadata: { image, replicas },
      });

      deployed.push({
        id: container._id,
        name: containerName,
        image,
        node: `${node.host}:${node.port}`,
      });
    } catch (err) {
      logger.error(`Failed to deploy replica ${i + 1}/${replicas} of ${name}: ${(err as Error).message}`);
      return res.status(503).json({
        error: `Deployment failed at replica ${replicaIndex}: ${(err as Error).message}`,
        dispatched: deployed,
      });
    }
  }

  return res.status(202).json({ status: 'dispatching', containers: deployed });
}
