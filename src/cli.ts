import { Command } from 'commander';
import path from 'path';
import Generator from './generator';

const exec = async (): Promise<void> => {
  const packageJson = require(path.join(__dirname, '../package.json'));

  const program = new Command();

  program
    .name(`svelte-dts`)
    .version(packageJson.version, '-v --version', 'Version number')
    .helpOption('-h --help', 'For more information')
    .requiredOption('-i, --input <input>', 'input of application')
    .requiredOption('-o, --output <output>', 'output of declarations')
    .option('-e, --extensions <extensions...>', 'valid extensions')
    .parse(process.argv);

  const options = program.opts();

  const generator = new Generator(options.input, { output: options.output, extensions: options.extensions });
  await generator.read();
  await generator.write();
};

exec();
