import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

interface WorkerNode {
  _id: string;
  host: string;
  port: number;
  status: string;
  containerCount: number;
  memoryMB: number;
  lastHeartbeat: string;
}

export const nodesCommand = new Command('nodes')
  .description('List registered worker nodes')
  .option('--host <url>', 'Control plane URL')
  .action(async (opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));

    try {
      const { data } = await client.get('/nodes');
      const nodes: WorkerNode[] = data.nodes;

      if (nodes.length === 0) {
        console.log(chalk.yellow('No nodes registered.'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Host', 'Port', 'Status', 'Containers', 'Memory (MB)', 'Last Seen'],
        style: { head: ['cyan'] },
      });

      for (const n of nodes) {
        const statusColor = n.status === 'active' ? chalk.green : chalk.red;
        const lastSeen = new Date(n.lastHeartbeat).toLocaleTimeString();
        table.push([
          n._id.slice(-8),
          n.host,
          n.port,
          statusColor(n.status),
          n.containerCount,
          n.memoryMB.toFixed(1),
          lastSeen,
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
