import axios from 'axios';
import { Node } from '../db/models/Node';
import { Container } from '../db/models/Container';
import { Event } from '../db/models/Event';
import { pickNode } from '../scheduler/index';
import { dispatchRun } from '../scheduler/dispatch';
import { config } from '../config';
import { logger } from '../logger';
import mongoose from 'mongoose';

interface WorkerHealthContainer {
  dockerId: string;
  name: string;
  running: boolean;
}

interface WorkerHealthResponse {
  nodeId: string;
  containers: WorkerHealthContainer[];
}

async function runHealthCheck() {
  const threshold = new Date(Date.now() - config.nodeLostThresholdMs);

  // 1. Mark nodes that haven't sent a heartbeat as lost
  const staleNodes = await Node.find({ status: 'active', lastHeartbeat: { $lt: threshold } });

  for (const node of staleNodes) {
    await Node.findByIdAndUpdate(node._id, { status: 'lost' });
    await Event.create({
      type: 'node_lost',
      nodeId: node._id,
      message: `Node ${node.host}:${node.port} stopped responding`,
      metadata: { host: node.host, port: node.port },
    });
    logger.warn(`Node ${node.host}:${node.port} marked as lost`);
  }

  // 2. Re-schedule containers that were on newly lost nodes
  const lostNodeIds = staleNodes.map((n) => n._id);
  if (lostNodeIds.length > 0) {
    const stranded = await Container.find({
      nodeId: { $in: lostNodeIds },
      status: 'running',
    });

    for (const container of stranded) {
      await rescheduleContainer(container, 'node_recovery');
    }
  }

  // 3. Check container health on each active node
  const activeNodes = await Node.find({ status: 'active' });

  for (const node of activeNodes) {
    let healthData: WorkerHealthResponse;

    try {
      const response = await axios.get<WorkerHealthResponse>(
        `http://${node.host}:${node.port}/health`,
        { timeout: 5_000 }
      );
      healthData = response.data;
    } catch {
      logger.warn(`Health check failed for node ${node.host}:${node.port}`);
      continue;
    }

    const runningContainers = healthData.containers.filter((c) => c.running);
    const runningDockerIds = new Set(runningContainers.map((c) => c.dockerId));
    // Index by name so pending containers can be confirmed by name (no dockerId yet).
    const runningByName = new Map(runningContainers.map((c) => [c.name, c.dockerId]));

    // Promote pending containers to running once the worker reports them.
    const pendingContainers = await Container.find({ nodeId: node._id, status: 'pending' });
    for (const container of pendingContainers) {
      const dockerId = runningByName.get(container.name);
      if (dockerId) {
        await Container.findByIdAndUpdate(container._id, { dockerId, status: 'running' });
        logger.info(`Container ${container.name} confirmed running (${dockerId.slice(0, 12)})`);
      }
    }

    // Find containers we think are running on this node
    const dbContainers = await Container.find({
      nodeId: node._id,
      status: 'running',
    });

    for (const container of dbContainers) {
      if (!runningDockerIds.has(container.dockerId)) {
        logger.warn(`Container ${container.name} (${container.dockerId}) is not running on ${node.host}:${node.port}`);
        await rescheduleContainer(container, 'crash_recovery');
      }
    }
  }
}

async function rescheduleContainer(
  container: mongoose.Document & {
    _id: mongoose.Types.ObjectId;
    dockerId: string;
    name: string;
    image: string;
    restartCount: number;
    status: string;
    nodeId: mongoose.Types.ObjectId;
  },
  reason: string
) {
  if (container.restartCount >= config.maxRestartCount) {
    await Container.findByIdAndUpdate(container._id, { status: 'dead' });
    logger.error(`Container ${container.name} exceeded max restarts, marking dead`);
    return;
  }

  await Container.findByIdAndUpdate(container._id, {
    status: 'restarting',
    $inc: { restartCount: 1 },
  });

  try {
    const targetNode = await pickNode();
    await dispatchRun(targetNode, container.image, container.name);

    // Clear the stale dockerId; the health loop will set the new one once the worker reports it.
    await Container.findByIdAndUpdate(container._id, {
      dockerId: '',
      nodeId: targetNode._id,
      status: 'pending',
    });

    await Event.create({
      type: 'restarted',
      containerId: container._id,
      nodeId: targetNode._id,
      message: `Container ${container.name} dispatched for restart on ${targetNode.host}:${targetNode.port}`,
      metadata: { reason, image: container.image },
    });

    logger.info(`Container ${container.name} dispatched for restart on ${targetNode.host}:${targetNode.port} (${reason})`);
  } catch (err) {
    await Container.findByIdAndUpdate(container._id, { status: 'dead' });
    logger.error(`Failed to reschedule ${container.name}: ${(err as Error).message}`);
  }
}

export function startHealthLoop() {
  logger.info(`Health check loop started (interval: ${config.healthCheckIntervalMs}ms, lost threshold: ${config.nodeLostThresholdMs}ms)`);

  setInterval(async () => {
    try {
      await runHealthCheck();
    } catch (err) {
      logger.error(`Health check error: ${(err as Error).message}`);
    }
  }, config.healthCheckIntervalMs);
}
