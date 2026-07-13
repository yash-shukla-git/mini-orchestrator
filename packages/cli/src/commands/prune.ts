import { Command } from 'commander';
import chalk from 'chalk';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

export const pruneCommand = new Command('prune')
  .description('Remove stopped and dead containers from the list')
  .option('--host <url>', 'Control plane URL')
  .action(async (opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));

    try {
      const { data } = await client.post('/containers/prune');

      if (data.removed === 0) {
        console.log(chalk.yellow('Nothing to prune.'));
        return;
      }

      console.log(chalk.green(`Removed ${data.removed} container(s):`));
      console.log((data.names as string[]).join(', '));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as Error).message;
      console.error(chalk.red(`Prune failed: ${msg}`));
      process.exit(1);
    }
  });
