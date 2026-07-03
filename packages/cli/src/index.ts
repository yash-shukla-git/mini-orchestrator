import { Command } from 'commander';
import { deployCommand } from './commands/deploy';
import { psCommand } from './commands/ps';
import { killCommand } from './commands/kill';
import { scaleCommand } from './commands/scale';
import { nodesCommand } from './commands/nodes';
import { logsCommand } from './commands/logs';

const program = new Command();

program
  .name('orchestrator')
  .description('CLI for mini-orchestrator — deploy and manage containers across worker nodes')
  .version('1.0.0');

program.addCommand(deployCommand);
program.addCommand(psCommand);
program.addCommand(killCommand);
program.addCommand(scaleCommand);
program.addCommand(nodesCommand);
program.addCommand(logsCommand);

program.parseAsync(process.argv);
