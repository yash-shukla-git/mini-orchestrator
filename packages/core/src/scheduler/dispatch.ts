import axios from 'axios';
import { INode } from '../db/models/Node';
import { logger } from '../logger';

export async function dispatchRun(node: INode, image: string, containerName: string): Promise<void> {
  const url = `http://${node.host}:${node.port}/run`;
  await axios.post(url, { image, name: containerName }, { timeout: 10_000 });
  logger.info(`Dispatched ${containerName} (${image}) → node ${node.host}:${node.port}`);
}

export async function dispatchKill(node: INode, dockerId: string, containerName: string): Promise<void> {
  const url = `http://${node.host}:${node.port}/container/${dockerId}?name=${encodeURIComponent(containerName)}`;
  await axios.delete(url, { timeout: 15_000 });
  logger.info(`Killed ${containerName} (${dockerId.slice(0, 12)}) on node ${node.host}:${node.port}`);
}
