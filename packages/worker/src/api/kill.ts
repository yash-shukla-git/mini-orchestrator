import { Request, Response } from 'express';
import { killContainer } from '../docker/kill';
import { logger } from '../logger';

export async function handleKill(req: Request, res: Response) {
  const { dockerId } = req.params;

  try {
    await killContainer(dockerId);
    return res.json({ ok: true });
  } catch (err) {
    logger.error(`Failed to kill ${dockerId}: ${(err as Error).message}`);
    return res.status(500).json({ error: (err as Error).message });
  }
}
