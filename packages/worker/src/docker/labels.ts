import { config } from '../config';

// All simulated nodes share one Docker daemon locally, so `docker.listContainers`
// returns every container on the host regardless of which worker dispatched it.
// Tag containers with the creating worker's port and filter on it everywhere
// containers are listed, so each worker only sees/reports its own.
export const WORKER_LABEL_KEY = 'orchestrator.worker';

export function ownContainerLabels(): Record<string, string> {
  return { [WORKER_LABEL_KEY]: String(config.workerPort) };
}

export function ownContainerFilter(): { label: string[] } {
  return { label: [`${WORKER_LABEL_KEY}=${config.workerPort}`] };
}
