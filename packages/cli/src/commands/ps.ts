import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

interface Container {
  _id: string;
  name: string;
  image: string;
  status: string;
  restartCount: number;
  nodeId: { host: string; port: number } | null;
  createdAt: string;
}

export const psCommand = new Command('ps')
  .description('List all containers')
  .option('--host <url>', 'Control plane URL')
  .option('--status <status>', 'Filter by status')
  .action(async (opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));
    const params: Record<string, string> = {};
    if (opts.status) params.status = opts.status;

    try {
      const { data } = await client.get('/containers', { params });
      const containers: Container[] = data.containers;

      if (containers.length === 0) {
        console.log(chalk.yellow('No containers found.'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Image', 'Status', 'Node', 'Restarts', 'Created'],
        style: { head: ['cyan'] },
      });

      for (const c of containers) {
        const node = c.nodeId ? `${c.nodeId.host}:${c.nodeId.port}` : '-';
        const statusColor = c.status === 'running' ? chalk.green : c.status === 'dead' ? chalk.red : chalk.yellow;
        table.push([
          c._id.slice(-8),
          c.name,
          c.image,
          statusColor(c.status),
          node,
          c.restartCount,
          new Date(c.createdAt).toLocaleTimeString(),
        ]);
      }

      console.log(table.toString());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as Error).message;
      console.error(chalk.red(`Error: ${msg}`));
      process.exit(1);
    }
  });
