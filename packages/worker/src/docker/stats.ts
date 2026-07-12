import Dockerode from 'dockerode';
import { docker } from './client';

export interface ContainerStats {
  dockerId: string;
  cpuPercent: number;
  memoryMB: number;
}

function computeCpuPercent(data: Dockerode.ContainerStats): number {
  const cpuStats = data.cpu_stats as {
    cpu_usage: { total_usage: number; percpu_usage?: number[] };
    system_cpu_usage: number;
    online_cpus?: number;
  };
  const preCpuStats = data.precpu_stats as {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
  };

  const cpuDelta = cpuStats.cpu_usage.total_usage - preCpuStats.cpu_usage.total_usage;
  const systemDelta = cpuStats.system_cpu_usage - preCpuStats.system_cpu_usage;
  const numCpus = cpuStats.online_cpus ?? cpuStats.cpu_usage.percpu_usage?.length ?? 1;

  return systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;
}

// Docker's stream emits one JSON document per tick, but a chunk boundary can
// land mid-document — walk brace depth to pull out whichever documents are
// fully buffered and return the leftover for the next chunk.
function extractJsonObjects(buffer: string): { objects: Dockerode.ContainerStats[]; rest: string } {
  const objects: Dockerode.ContainerStats[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (buffer[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          objects.push(JSON.parse(buffer.slice(start, i + 1)));
        } catch {
          // malformed fragment, skip it
        }
        start = -1;
      }
    }
  }

  return { objects, rest: start !== -1 ? buffer.slice(start) : '' };
}

export async function getContainerStats(dockerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(dockerId);

  return new Promise((resolve, reject) => {
    container.stats({ stream: true }, (err: Error | null, stream?: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      if (!stream) return resolve({ dockerId, cpuPercent: 0, memoryMB: 0 });

      let buffer = '';
      let sampleCount = 0;
      let settled = false;

      // Guard against a container that stops sending stats mid-read (e.g. it exits).
      const timeout = setTimeout(() => finish({ dockerId, cpuPercent: 0, memoryMB: 0 }), 5_000);

      function finish(result: ContainerStats) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        stream!.removeAllListeners();
        (stream as unknown as { destroy: () => void }).destroy();
        resolve(result);
      }

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const { objects, rest } = extractJsonObjects(buffer);
        buffer = rest;

        for (const data of objects) {
          sampleCount++;

          // The first sample on a fresh read has no prior tick to diff
          // against, so its precpu_stats is empty and any CPU % computed
          // from it is meaningless (this is exactly why a one-shot
          // stream:false snapshot always reports 0%). Wait for the second
          // sample, whose precpu_stats is the real first sample.
          if (sampleCount < 2) continue;

          try {
            const memStats = data.memory_stats as { usage: number };
            finish({
              dockerId,
              cpuPercent: Math.round(computeCpuPercent(data) * 100) / 100,
              memoryMB: Math.round((memStats.usage / (1024 * 1024)) * 100) / 100,
            });
          } catch {
            finish({ dockerId, cpuPercent: 0, memoryMB: 0 });
          }
          return;
        }
      });

      stream.on('error', () => finish({ dockerId, cpuPercent: 0, memoryMB: 0 }));
    });
  });
}
