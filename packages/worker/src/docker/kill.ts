import { docker } from './client';
import { logger } from '../logger';

export async function killContainer(dockerId: string, containerName?: string): Promise<void> {
  const container = docker.getContainer(dockerId);

  try {
    await container.stop({ t: 5 });
  } catch (err: unknown) {
    // 304 = already stopped, 404 = already gone — both are fine
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== 304 && status !== 404) throw err;
  }

  try {
    await container.remove();
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== 404) throw err;
  }

  logger.info(`Removed ${containerName ?? 'container'} (${dockerId.slice(0, 12)})`);
}
