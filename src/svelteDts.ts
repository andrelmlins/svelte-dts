import { Plugin } from 'rollup';
import { Options } from './types';
import Generator from './generator';

export const svelteDts = (options: Options): Plugin => {
  let generator: Generator;

  return {
    name: 'svelte-dts',
    async buildStart({ input }) {
      generator = new Generator(input[0], options);
    },
    async generateBundle() {
      await generator.read();
    },
    async writeBundle() {
      await generator.write();
    },
  };
};
