import { Command } from 'commander';
import chalk from 'chalk';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

export const killCommand = new Command('kill')
  .description('Kill a running container')
  .argument('<id>', 'Container ID (full or last 8 chars)')
  .option('--host <url>', 'Control plane URL')
  .action(async (id, opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));

    try {
      const { data } = await client.delete(`/container/${id}`);
      console.log(chalk.green(`Killed: ${data.name}`));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as Error).message;
      console.error(chalk.red(`Kill failed: ${msg}`));
      process.exit(1);
    }
  });
