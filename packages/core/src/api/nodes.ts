import { Request, Response } from 'express';
import { Node } from '../db/models/Node';
import { getContainerLoadMap } from '../scheduler/index';

export async function listNodes(req: Request, res: Response) {
  const nodes = await Node.find().sort({ registeredAt: 1 });
  const loadMap = await getContainerLoadMap(nodes.map((n) => n._id));

  const result = nodes.map((n) => ({
    ...n.toObject(),
    containerCount: loadMap.get(String(n._id)) ?? 0,
  }));

  return res.json({ nodes: result });
}
