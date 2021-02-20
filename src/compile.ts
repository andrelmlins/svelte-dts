import * as ts from "typescript";
import path from "path";

function compile(fileName: string, options: ts.CompilerOptions): void {
  const createdFiles = {};
  const host = ts.createCompilerHost(options);
  host.writeFile = (fileName: string, contents: string) =>
    (createdFiles[fileName] = contents);

  const program = ts.createProgram([fileName], options, host);
  const sourceFile = program.getSourceFile(fileName);

  console.log("interface SvelteFacebookLogin {");

  if (sourceFile) {
    ts.forEachChild(sourceFile, (node: ts.Node) => {
      if (ts.isVariableStatement(node)) {
        if (containExportModifier(node)) {
          node.declarationList.declarations.map((item) =>
            readDetails(item, sourceFile)
          );
        } else if (isEventDispatcher(node, sourceFile)) {
          node.declarationList.declarations.map((item) =>
            readEventDetails(item, sourceFile)
          );
        }
      }
    });
  }

  console.log("}\nexport default SvelteFacebookLogin;");
}

const containExportModifier = (node: ts.VariableStatement): boolean => {
  if (node.modifiers) {
    return node.modifiers.some(
      (node: ts.Node) => node.kind === ts.SyntaxKind.ExportKeyword
    );
  }

  return false;
};

const isEventDispatcher = (
  node: ts.VariableStatement,
  sourceFile: ts.SourceFile
): boolean => {
  return node.declarationList.declarations.some(
    (item) =>
      ts.isVariableDeclaration(item) &&
      item.initializer &&
      ts.isCallExpression(item.initializer) &&
      item.initializer.expression.getText(sourceFile) ===
        "createEventDispatcher"
  );
};

const readDetails = (
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile
): void => {
  const name = node.name.getText(sourceFile);

  let type = "any";
  if (node.type) {
    type = node.type.getText(sourceFile);
  }

  console.log(`  ${name}: ${type};`);
};

const readEventDetails = (
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile
): void => {
  if (
    node.initializer &&
    ts.isCallExpression(node.initializer) &&
    node.initializer.typeArguments
  ) {
    node.initializer.typeArguments.forEach((item) => {
      if (ts.isTypeLiteralNode(item)) {
        item.members.forEach((member) => {
          if (ts.isPropertySignature(member)) {
            console.log(
              `  ${member.name.getText(sourceFile)}: CustomEvent<${
                member.type?.getText(sourceFile) || "any"
              }>;`
            );
          }
        });
      }
    });
  }
};

compile(path.join(__dirname, "./test.ts"), {
  allowJs: true,
  declaration: true,
  emitDeclarationOnly: true,
});
