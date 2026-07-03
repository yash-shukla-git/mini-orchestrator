import { Command } from 'commander';
import http from 'http';
import https from 'https';
import chalk from 'chalk';
import { getControlPlaneUrl } from '../config';

export const logsCommand = new Command('logs')
  .description('Stream logs from a container')
  .argument('<containerId>', 'Container MongoDB ID')
  .option('--host <url>', 'Control plane URL')
  .action((containerId, opts) => {
    const base = getControlPlaneUrl(opts.host);
    const url = `${base}/logs/${containerId}`;

    console.log(chalk.gray(`Streaming logs for ${containerId}...\n`));

    const protocol = url.startsWith('https') ? https : http;
    let buffer = '';

    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error(chalk.red(`Error: server returned ${res.statusCode}`));
        process.exit(1);
      }

      res.setEncoding('utf8');

      res.on('data', (chunk: string) => {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            process.stdout.write(line.slice(6) + '\n');
          }
        }
      });

      res.on('end', () => {
        process.exit(0);
      });

      res.on('error', (err: Error) => {
        console.error(chalk.red(`Stream error: ${err.message}`));
        process.exit(1);
      });
    });

    req.on('error', (err: Error) => {
      console.error(chalk.red(`Could not connect to control plane: ${err.message}`));
      process.exit(1);
    });

    process.on('SIGINT', () => {
      req.destroy();
      process.exit(0);
    });
  });
