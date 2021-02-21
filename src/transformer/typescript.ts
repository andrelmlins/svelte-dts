import * as ts from 'typescript';
import path from 'path';
import { promises as fs } from 'fs';
import ITransformer from './transformer';

class TypescriptTransformer implements ITransformer {
  private fileName: string;
  private dir: string;
  private subdir: string;
  private moduleName: string;
  private isDefault: boolean;
  private declaration: string;

  constructor(fileName: string, dir: string, moduleName: string, isDefault: boolean) {
    this.fileName = fileName;
    this.dir = dir;
    this.subdir = path.dirname(this.fileName).replace(this.dir, '');
    this.moduleName = moduleName;
    this.isDefault = isDefault;
  }

  exec(): void {
    const options = { declaration: true, emitDeclarationOnly: true };
    const host = ts.createCompilerHost(options);
    host.writeFile = (_, contents: string) => {
      this.declaration = contents;
    };

    const program = ts.createProgram([this.fileName], options, host);
    program.emit();
  }

  toString(): string {
    const pathParse = path.parse(this.fileName);
    let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}' {\n`;

    if (this.isDefault) {
      string = `declare module '${this.moduleName}' {\n`;
    }

    string += this.declaration
      .split('\n')
      .map((item) => (item !== '' ? `\t${item}` : undefined))
      .filter((item) => !!item)
      .join('\n');

    string += `\n}\n\n`;

    return string;
  }

  async appendFile(path: string): Promise<void> {
    this.exec();
    await fs.appendFile(path, this.toString());
  }
}

export default TypescriptTransformer;
