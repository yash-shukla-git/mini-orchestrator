import { Request, Response } from 'express';
import { runContainer } from '../docker/run';
import { logger } from '../logger';

export async function handleRun(req: Request, res: Response) {
  const { image, name } = req.body as { image: string; name: string };

  if (!image || !name) {
    return res.status(400).json({ error: 'image and name are required' });
  }

  // Respond immediately so the control plane isn't blocked on image pull time.
  res.status(202).json({ status: 'accepted' });

  runContainer(image, name).catch((err) => {
    logger.error(`Failed to run ${name}: ${(err as Error).message}`);
  });
}
