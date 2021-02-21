import { preprocess, compile as svelteCompile } from 'svelte/compiler';
import { Plugin } from 'rollup';
import path from 'path';
import oldFs, { promises as fs } from 'fs';
import * as ts from 'typescript';
import readdir from 'recursive-readdir';
import Token from './token';
import { Options } from './types';

export const svelteDts = (options: Options): Plugin => {
  const tokens: Token[] = [];
  let packageJson: Record<string, any> = {};
  let dir: string;
  let main: string;
  let output: string;

  return {
    name: 'svelte-dts',
    async buildStart({ input }) {
      packageJson = JSON.parse(await fs.readFile(path.join(process.cwd(), 'package.json'), { encoding: 'utf-8' }));

      main = path.join(process.cwd(), input[0]);
      dir = path.dirname(main);
      output = options.output || packageJson.types;
    },
    async generateBundle() {
      const files: string[] = await readdir(dir, ['node_modules']);

      for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        const extension = path.extname(filename);

        if (['.svelte', '.ts'].includes(extension)) {
          const fileContent = await fs.readFile(filename, { encoding: 'utf-8' });

          let scriptTsContent: string = '';
          const resultPreprocess = await preprocess(
            fileContent,
            [
              {
                script: ({ content, attributes }) => {
                  if (attributes.lang === 'ts') {
                    scriptTsContent = content;

                    const resultTranspile = ts.transpileModule(content, {
                      compilerOptions: {
                        module: ts.ModuleKind.ESNext,
                        target: ts.ScriptTarget.ESNext,
                        moduleResolution: ts.ModuleResolutionKind.NodeJs,
                        strict: true,
                      },
                    });

                    return { code: resultTranspile.outputText };
                  }

                  return { code: content };
                },
              },
            ],
            { filename }
          );

          if (scriptTsContent) {
            const compiled = svelteCompile(resultPreprocess.code, {
              filename,
            });

            tokens.push(new Token(scriptTsContent, filename, compiled.ast, dir, packageJson.name, main === filename));
          }
        }
      }
    },
    async writeBundle() {
      const typesPath = path.join(process.cwd(), output);

      if (oldFs.existsSync(typesPath)) {
        fs.unlink(typesPath);
      }
      fs.writeFile(typesPath, 'import { SvelteComponentTyped } from "svelte";\n\n');

      await Promise.all(tokens.map((token) => token.appendFile(typesPath)));
    },
  };
};
