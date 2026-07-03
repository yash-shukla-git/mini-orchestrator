import { Request, Response } from 'express';
import { Node } from '../db/models/Node';

export async function listNodes(req: Request, res: Response) {
  const nodes = await Node.find().sort({ registeredAt: 1 });
  return res.json({ nodes });
}
