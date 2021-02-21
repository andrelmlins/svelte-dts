import path from 'path';
import { promises as fs } from 'fs';
import ITransformer from './transformer';

class JavascriptTransformer implements ITransformer {
  private fileName: string;
  private dir: string;
  private subdir: string;
  private moduleName: string;
  private isDefault: boolean;

  constructor(fileName: string, dir: string, moduleName: string, isDefault: boolean) {
    this.fileName = fileName;
    this.dir = dir;
    this.subdir = path.dirname(this.fileName).replace(this.dir, '');
    this.moduleName = moduleName;
    this.isDefault = isDefault;
  }

  exec(): void {
    //
  }

  toString(): string {
    const pathParse = path.parse(this.fileName);
    let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}';\n\n`;

    if (this.isDefault) {
      string = `declare module '${this.moduleName}';\n\n`;
    }

    return string;
  }

  async appendFile(path: string): Promise<void> {
    this.exec();
    await fs.appendFile(path, this.toString());
  }
}

export default JavascriptTransformer;
