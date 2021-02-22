import * as ts from 'typescript';
import path from 'path';
import { promises as fs } from 'fs';
import { Ast, TemplateNode } from 'svelte/types/compiler/interfaces';
import tmp from 'tmp';
import { Prop, Event, SlotProp } from '../types';
import ITransformer from './transformer';

class SvelteTransformer implements ITransformer {
  private fileName: string;
  private sourceFile: ts.SourceFile;
  private ast: Ast;
  private props: Prop[];
  private slotProps: SlotProp[];
  private events: Event[];
  private dir: string;
  private subdir: string;
  private moduleName: string;
  private isDefault: boolean;
  private typesForSearch: ts.TypeReferenceNode[];
  private declarationNode: string[];
  private declarationImport: string[];

  constructor(content: string, fileName: string, ast: Ast, dir: string, moduleName: string, isDefault: boolean) {
    this.sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest);
    this.fileName = fileName;
    this.ast = ast;
    this.props = [];
    this.events = [];
    this.slotProps = [];
    this.dir = dir;
    this.subdir = path.dirname(this.fileName).replace(this.dir, '');
    this.moduleName = moduleName;
    this.isDefault = isDefault;
    this.typesForSearch = [];
    this.declarationNode = [];
    this.declarationImport = [];
  }

  private containExportModifier = (node: ts.VariableStatement): boolean => {
    if (node.modifiers) {
      return node.modifiers.some((node: ts.Node) => node.kind === ts.SyntaxKind.ExportKeyword);
    }

    return false;
  };

  private isEventDispatcher(node: ts.VariableStatement): boolean {
    return node.declarationList.declarations.some(
      (item) =>
        ts.isVariableDeclaration(item) &&
        item.initializer &&
        ts.isCallExpression(item.initializer) &&
        item.initializer.expression.getText(this.sourceFile) === 'createEventDispatcher'
    );
  }

  private compileProperty(node: ts.VariableStatement): void {
    node.declarationList.declarations.forEach((declaration) => {
      const name = declaration.name.getText(this.sourceFile);

      let type = 'any';
      let isOptional = false;

      if (declaration.type) {
        type = declaration.type.getText(this.sourceFile);

        if (ts.isTypeReferenceNode(declaration.type)) {
          this.typesForSearch.push(declaration.type);
        }

        if (ts.isUnionTypeNode(declaration.type)) {
          const nameValidTypes = declaration.type.types.reduce((acc, type) => {
            if (type.kind === ts.SyntaxKind.NullKeyword || type.kind === ts.SyntaxKind.UndefinedKeyword) {
              isOptional = true;
              return acc;
            }

            return [...acc, type.getText(this.sourceFile)];
          }, []);

          type = nameValidTypes.join(' | ');
        }
      }

      this.props.push({ name, type, isOptional });
    });
  }

  private compileEvent(node: ts.VariableStatement): void {
    node.declarationList.declarations.forEach((declaration) => {
      if (
        declaration.initializer &&
        ts.isCallExpression(declaration.initializer) &&
        declaration.initializer.typeArguments
      ) {
        declaration.initializer.typeArguments.forEach((item) => {
          if (ts.isTypeLiteralNode(item)) {
            item.members.forEach((member) => {
              if (ts.isPropertySignature(member)) {
                const name = member.name.getText(this.sourceFile);
                const type = member.type?.getText(this.sourceFile) || 'any';

                this.events.push({ name, type });
              }
            });
          }
        });
      }
    });
  }

  private execSlotProperty(node: TemplateNode): void {
    if (node.type === 'Slot' && node.attributes) {
      node.attributes.forEach((item) => this.slotProps.push({ name: item.name, type: 'any' }));
    }

    if (node.children) {
      node.children.forEach((item) => this.execSlotProperty(item));
    }
  }

  private verifyImportDeclaration(node: ts.ImportDeclaration, name: string): void {
    if (node.importClause && node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      const elements = node.importClause.namedBindings.elements;
      const newElements = elements.filter((element) => element.name.getText(this.sourceFile) === name);

      if (newElements.length > 0) {
        const importString = newElements.map((item) => item.name.getText(this.sourceFile)).join(', ');

        this.declarationImport.push(
          `import { ${importString} } from ${node.moduleSpecifier.getText(this.sourceFile)};`
        );
      }
    }
  }

  exec(): void {
    ts.forEachChild(this.sourceFile, (node: ts.Node) => {
      if (ts.isVariableStatement(node)) {
        if (this.containExportModifier(node)) {
          this.compileProperty(node);
        } else if (this.isEventDispatcher(node)) {
          this.compileEvent(node);
        }
      }
    });

    this.typesForSearch.forEach((item) => {
      const name = item.typeName.getText(this.sourceFile);
      ts.forEachChild(this.sourceFile, (node: ts.Node) => {
        if (ts.isInterfaceDeclaration(node) || ts.isClassDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
          if (node.name?.getText(this.sourceFile) === name) {
            this.declarationNode.push(node.getText(this.sourceFile));
          }
        } else if (ts.isImportDeclaration(node)) {
          this.verifyImportDeclaration(node, name);
        }
      });
    });

    this.execSlotProperty(this.ast.html);
  }

  private async toStringDeclarations(): Promise<string> {
    const tempFile = tmp.fileSync({ postfix: '.ts' });
    const content = this.declarationNode.reduce((acc, item) => `${acc}${item}\n\n`, '');
    let declaration = '';

    await fs.writeFile(tempFile.name, content);

    const options = { declaration: true, emitDeclarationOnly: true };
    const host = ts.createCompilerHost(options);
    host.writeFile = (_, contents: string) => (declaration = contents);
    const program = ts.createProgram([tempFile.name], options, host);
    program.emit();

    tempFile.removeCallback();

    declaration = declaration
      .replace(/declare /g, '')
      .split('\n')
      .map((item) => `\t${item}`)
      .join('\n');

    return `${declaration}\n`;
  }

  async toString(): Promise<string> {
    const pathParse = path.parse(this.fileName);
    const propsString = this.props.reduce(
      (acc, prop) => `${acc}\n\t\t${prop.name}${prop.isOptional ? '?' : ''}: ${prop.type};`,
      ''
    );
    const eventsString = this.events.map((event) => `${event.name}: CustomEvent<${event.type}>`).join(', ');
    const slotPropsString = this.slotProps.map((slotProp) => `${slotProp.name}: ${slotProp.type}`).join(', ');

    let string = `declare module '${this.moduleName}${this.subdir}/${pathParse.base}' {\n`;

    if (this.isDefault) {
      string = `declare module '${this.moduleName}' {\n`;
    }

    if (this.declarationImport.length > 0) {
      string += this.declarationImport.reduce((acc, item) => `${acc}\t${item}\n`, '');
      string += '\n';
    }

    if (this.declarationNode.length > 0) {
      string += await this.toStringDeclarations();
    }

    string += `\tinterface ${pathParse.name}Props {${propsString}\n\t}\n\n`;
    string += `\tclass ${pathParse.name} extends SvelteComponentTyped<\n`;
    string += `\t\t${pathParse.name}Props,\n\t\t{ ${eventsString} },\n\t\t{ ${slotPropsString} }\n\t> {}`;
    string += `\n\n\texport default ${pathParse.name};\n}\n\n`;

    return string;
  }

  async appendFile(path: string): Promise<void> {
    this.exec();
    await fs.appendFile(path, await this.toString());
  }
}

export default SvelteTransformer;
