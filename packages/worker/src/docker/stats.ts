import Dockerode from 'dockerode';
import { docker } from './client';

export interface ContainerStats {
  dockerId: string;
  cpuPercent: number;
  memoryMB: number;
}

export async function getContainerStats(dockerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(dockerId);

  return new Promise((resolve, reject) => {
    container.stats({ stream: false }, (err: Error | null, data: Dockerode.ContainerStats | undefined) => {
      if (err) return reject(err);
      if (!data) return resolve({ dockerId, cpuPercent: 0, memoryMB: 0 });

      try {
        const cpuStats = data.cpu_stats as {
          cpu_usage: { total_usage: number; percpu_usage?: number[] };
          system_cpu_usage: number;
          online_cpus?: number;
        };
        const preCpuStats = data.precpu_stats as {
          cpu_usage: { total_usage: number };
          system_cpu_usage: number;
        };
        const memStats = data.memory_stats as { usage: number };

        const cpuDelta = cpuStats.cpu_usage.total_usage - preCpuStats.cpu_usage.total_usage;
        const systemDelta = cpuStats.system_cpu_usage - preCpuStats.system_cpu_usage;
        const numCpus = cpuStats.online_cpus ?? cpuStats.cpu_usage.percpu_usage?.length ?? 1;
        const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

        resolve({
          dockerId,
          cpuPercent: Math.round(cpuPercent * 100) / 100,
          memoryMB: Math.round((memStats.usage / (1024 * 1024)) * 100) / 100,
        });
      } catch {
        resolve({ dockerId, cpuPercent: 0, memoryMB: 0 });
      }
    });
  });
}
