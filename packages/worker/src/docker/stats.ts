import { docker } from './client';

export interface ContainerStats {
  dockerId: string;
  memoryMB: number;
}

export async function getContainerStats(dockerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(dockerId);
  const data = await container.stats({ stream: false });
  const memStats = data.memory_stats as { usage: number };

  return {
    dockerId,
    memoryMB: Math.round((memStats.usage / (1024 * 1024)) * 100) / 100,
  };
}
