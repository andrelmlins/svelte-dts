import * as ts from 'typescript';
import path from 'path';
import { promises as fs } from 'fs';
import { Ast, TemplateNode } from 'svelte/types/compiler/interfaces';
import { Prop, Event, SlotProp } from './types';

class Token {
  fileName: string;
  sourceFile: ts.SourceFile;
  ast: Ast;
  props: Prop[];
  slotProps: SlotProp[];
  events: Event[];
  dir: string;
  subdir: string;
  moduleName: string;
  isDefault: boolean;

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

    this.execSlotProperty(this.ast.html);
  }

  toString(): string {
    const componentName = path.basename(this.fileName).replace(path.extname(this.fileName), '');
    const propsString = this.props.reduce(
      (acc, prop) => `${acc}\n\t\t${prop.name}${prop.isOptional ? '?' : ''}: ${prop.type};`,
      ''
    );
    const eventsString = this.events.map((event) => `${event.name}: ${event.type}`).join(', ');
    const slotPropsString = this.slotProps.map((slotProp) => `${slotProp.name}: ${slotProp.type}`).join(', ');

    let string = `declare module '${this.moduleName}${this.subdir}/${componentName}' {\n`;

    if (this.isDefault) {
      string = `declare module '${this.moduleName}' {\n`;
    }

    string += `\tinterface ${componentName}Props {${propsString}\n\t}\n\n`;
    string += `\tclass ${componentName} extends SvelteComponentTyped<\n`;
    string += `\t\t${componentName}Props,\n\t\t{ ${eventsString} },\n\t\t{ ${slotPropsString} }\n\t> {}`;
    string += `\n\n\texport default ${componentName};\n}\n\n`;

    return string;
  }

  async appendFile(path: string): Promise<void> {
    this.exec();
    await fs.appendFile(path, this.toString());
  }
}

export default Token;
