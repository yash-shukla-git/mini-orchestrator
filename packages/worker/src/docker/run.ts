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

async function removeExisting(name: string): Promise<void> {
  const matches = await docker.listContainers({
    all: true,
    filters: { name: [name] },
  });

  // Docker name filter is a prefix match, so verify the exact name.
  const exact = matches.find((c) =>
    c.Names.some((n) => n === `/${name}` || n === name)
  );

  if (exact) {
    logger.info(`Removing existing container ${name} (${exact.Id.slice(0, 12)})`);
    await docker.getContainer(exact.Id).remove({ force: true });
  }
}

export async function runContainer(image: string, name: string): Promise<string> {
  logger.info(`Pulling image: ${image}`);
  await pullImage(image);

  await removeExisting(name);

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
