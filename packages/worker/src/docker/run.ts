import { docker } from './client';
import { logger } from '../logger';

async function pullImage(image: string): Promise<void> {
  return new Promise((resolve, reject) => {
    docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export async function runContainer(image: string, name: string): Promise<string> {
  logger.info(`Pulling image: ${image}`);
  await pullImage(image);

  logger.info(`Creating container: ${name}`);
  const container = await docker.createContainer({
    Image: image,
    name,
    HostConfig: {
      // Keep the container around after it exits so the health loop can detect the stopped state
      AutoRemove: false,
    },
  });

  await container.start();
  logger.info(`Started container ${name} (${container.id.slice(0, 12)})`);

  return container.id;
}
