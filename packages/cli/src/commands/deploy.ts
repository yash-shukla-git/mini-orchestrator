import { Command } from 'commander';
import chalk from 'chalk';
import { makeClient } from '../client';
import { getControlPlaneUrl } from '../config';

interface DeployedItem {
  id: string;
  name: string;
  image: string;
  node: string;
}

export const deployCommand = new Command('deploy')
  .description('Deploy one or more containers')
  .requiredOption('--image <image>', 'Docker image to run')
  .requiredOption('--name <name>', 'Deployment group name')
  .option('--replicas <n>', 'Number of replicas', '1')
  .option('--host <url>', 'Control plane URL')
  .action(async (opts) => {
    const client = makeClient(getControlPlaneUrl(opts.host));
    const replicas = parseInt(opts.replicas, 10);

    try {
      const { data } = await client.post('/deploy', {
        image: opts.image,
        name: opts.name,
        replicas,
      });

      console.log(chalk.green(`\nDispatching ${data.containers.length} container(s):\n`));
      for (const item of data.containers as DeployedItem[]) {
        console.log(
          `  ${chalk.bold(item.name)}  →  node ${chalk.cyan(item.node)}  ${chalk.dim('(pulling image…)')}`
        );
      }
      console.log(chalk.dim('\n  Use `orchestrator ps` to check when containers are running.\n'));
      console.log();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error ?? (err as Error).message;
      console.error(chalk.red(`Deploy failed: ${msg}`));
      process.exit(1);
    }
  });
