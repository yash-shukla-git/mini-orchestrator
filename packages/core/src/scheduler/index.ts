import { Node, INode } from '../db/models/Node';

export async function pickNode(): Promise<INode> {
  const nodes = await Node.find({ status: 'active' }).sort({ containerCount: 1 });

  if (nodes.length === 0) {
    throw new Error('No active worker nodes available');
  }

  return nodes[0];
}