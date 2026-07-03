import axios from 'axios';
import { INode, Node } from '../db/models/Node';
import { logger } from '../logger';

export async function dispatchRun(
  node: INode,
  image: string,
  containerName: string
): Promise<void> {
  const url = `http://${node.host}:${node.port}/run`;

  // Worker responds immediately (202) before pulling the image, so a short timeout is safe.
  await axios.post(url, { image, name: containerName }, { timeout: 10_000 });

  // Optimistically bump the count so the scheduler doesn't double-assign under concurrent deploys.
  // The next heartbeat from the worker will set the authoritative value.
  await Node.findByIdAndUpdate(node._id, { $inc: { containerCount: 1 } });

  logger.info(`Dispatched ${containerName} (${image}) → node ${node.host}:${node.port}`);
}

export async function dispatchKill(node: INode, dockerId: string): Promise<void> {
  const url = `http://${node.host}:${node.port}/container/${dockerId}`;
  await axios.delete(url, { timeout: 15_000 });
  await Node.findByIdAndUpdate(node._id, { $inc: { containerCount: -1 } });
  logger.info(`Killed container ${dockerId} on node ${node.host}:${node.port}`);
}
