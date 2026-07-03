import { Command } from 'commander';
import chalk from 'chalk';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

export const scaleCommand = new Command('scale')
  .description('Scale a deployment up or down')
  .requiredOption('--name <name>', 'Deployment group name')
  .requiredOption('--replicas <n>', 'Target number of replicas')
  .option('--host <url>', 'Control plane URL')
  .action(async (opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));

    try {
      const { data } = await client.post('/scale', {
        name: opts.name,
        replicas: parseInt(opts.replicas, 10),
      });

      if (data.message) {
        console.log(chalk.yellow(data.message));
        return;
      }

      const direction = data.scaled === 'up' ? chalk.green('up') : chalk.yellow('down');
      console.log(`Scaled ${direction}: ${data.from} → ${data.to} replicas`);

      if (data.added?.length) {
        console.log(chalk.green('Added:'), data.added.join(', '));
      }
      if (data.removed?.length) {
        console.log(chalk.yellow('Removed:'), data.removed.join(', '));
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as Error).message;
      console.error(chalk.red(`Scale failed: ${msg}`));
      process.exit(1);
    }
  });
