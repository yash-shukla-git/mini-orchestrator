import { Request, Response } from 'express';
import { Container } from '../db/models/Container';
import { Node } from '../db/models/Node';
import { Event } from '../db/models/Event';
import { dispatchKill } from '../scheduler/dispatch';
import { logger } from '../logger';

export async function listContainers(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.groupName) filter.groupName = req.query.groupName;

  const containers = await Container.find(filter)
    .populate('nodeId', 'host port status')
    .sort({ createdAt: -1 });

  return res.json({ containers });
}

export async function killContainer(req: Request, res: Response) {
  const { id } = req.params;

  const container = await Container.findById(id);
  if (!container) {
    return res.status(404).json({ error: 'Container not found' });
  }

  if (container.status !== 'running') {
    return res.status(400).json({ error: `Container is not running (status: ${container.status})` });
  }

  const node = await Node.findById(container.nodeId);
  if (!node) {
    return res.status(500).json({ error: 'Node not found for this container' });
  }

  try {
    await dispatchKill(node, container.dockerId, container.name);
  } catch (err) {
    logger.warn(`Could not reach node to kill container ${container.dockerId}, marking stopped anyway`);
  }

  await Container.findByIdAndUpdate(id, { status: 'stopped', stoppedAt: new Date() });

  await Event.create({
    type: 'killed',
    containerId: container._id,
    nodeId: node._id,
    message: `Container ${container.name} killed`,
    metadata: { dockerId: container.dockerId },
  });

  return res.json({ ok: true, name: container.name });
}
