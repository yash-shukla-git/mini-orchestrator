import mongoose from 'mongoose';
import { Node, INode } from '../db/models/Node';
import { Container } from '../db/models/Container';

export async function getContainerLoadMap(nodeIds: mongoose.Types.ObjectId[]): Promise<Map<string, number>> {
  const loads = await Container.aggregate([
    { $match: { nodeId: { $in: nodeIds }, status: { $in: ['pending', 'running'] } } },
    { $group: { _id: '$nodeId', count: { $sum: 1 } } },
  ]);

  return new Map(loads.map((l) => [String(l._id), l.count]));
}

export async function pickNode(): Promise<INode> {
  const nodes = await Node.find({ status: 'active' });
  if (nodes.length === 0) {
    throw new Error('No active worker nodes available');
  }

  const loadMap = await getContainerLoadMap(nodes.map((n) => n._id));
  nodes.sort((a, b) => (loadMap.get(String(a._id)) ?? 0) - (loadMap.get(String(b._id)) ?? 0));

  return nodes[0];
}