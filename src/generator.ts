import { preprocess, compile as svelteCompile } from 'svelte/compiler';
import * as ts from 'typescript';
import readdir from 'recursive-readdir';
import oldFs, { promises as fs } from 'fs';
import path from 'path';
import { Options } from './types';
import SvelteTransformer from './transformer/svelte';
import TypescriptTransformer from './transformer/typescript';
import JavascriptTransformer from './transformer/javascript';
import ITransform from './transformer/transformer';

class Generator {
  private transformers: ITransform[] = [];
  private packageJson: Record<string, any>;
  private dir: string;
  private output: string;
  private input: string;
  private options: Options;

  constructor(input: string, options: Options) {
    this.options = options;

    this.packageJson = require(path.join(process.cwd(), 'package.json'));
    this.input = path.join(process.cwd(), input);
    this.dir = path.dirname(this.input);
    this.output = this.options.output || this.packageJson.types;
  }

  async read(): Promise<void> {
    const files: string[] = await readdir(this.dir, ['node_modules']);

    for (let i = 0; i < files.length; i++) {
      const filename = files[i];
      const pathParser = path.parse(filename);
      const extension = path.extname(filename);

      if (pathParser.base.includes('.test') || pathParser.base.includes('.spec')) {
        continue;
      }

      if (extension === '.svelte') {
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

          this.transformers.push(
            new SvelteTransformer(
              scriptTsContent,
              filename,
              compiled.ast,
              this.dir,
              this.packageJson.name,
              this.input === filename
            )
          );
        }
      } else if (extension === '.ts') {
        this.transformers.push(
          new TypescriptTransformer(filename, this.dir, this.packageJson.name, this.input === filename)
        );
      } else if (extension === '.js') {
        this.transformers.push(
          new JavascriptTransformer(filename, this.dir, this.packageJson.name, this.input === filename)
        );
      }
    }
  }

  async write(): Promise<void> {
    const typesPath = path.join(process.cwd(), this.output);

    if (oldFs.existsSync(typesPath)) {
      fs.unlink(typesPath);
    }
    fs.writeFile(typesPath, 'import { SvelteComponentTyped } from "svelte";\n\n');

    await Promise.all(this.transformers.map((token) => token.appendFile(typesPath)));
  }
}

export default Generator;
