import { Command } from 'commander';
import path from 'path';

const packageJson = require(path.join(__dirname, '../package.json'));

const program = new Command();

program
  .name(`svelte-dts`)
  .version(packageJson.version, '-v --version', 'Version number')
  .helpOption('-h --help', 'For more information')
  .option('-i, --input', 'dts input')
  .option('-o, --output', 'dts output');

program.parse(process.argv);
