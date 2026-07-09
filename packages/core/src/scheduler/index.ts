import { Node, INode } from '../db/models/Node';
import { Container } from '../db/models/Container';

export async function pickNode(): Promise<INode> {
  const nodes = await Node.find({ status: 'active' });

  if (nodes.length === 0) {
    throw new Error('No active worker nodes available');
  }

  const nodeCounts = await Promise.all(
      nodes.map(async (node) => ({
        node,
        count: await Container.countDocuments({ nodeId: node._id, status: 'running' }),
      }))
  );

  nodeCounts.sort((a, b) => a.count - b.count);
  return nodeCounts[0].node;
}