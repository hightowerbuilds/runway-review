export type NamedFunctionMatch = {
  name: string
  startLine: number
  endLine: number
}

export async function extractNamedFunctionsFromTsx(
  code: string,
): Promise<NamedFunctionMatch[]> {
  const ts = await import('typescript')
  const sourceFile = ts.createSourceFile(
    'file.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const matches: NamedFunctionMatch[] = []
  const seen = new Set<string>()

  function addName(name: string, node: import('typescript').Node) {
    if (seen.has(name)) {
      return
    }

    seen.add(name)
    const startLine =
      sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1
    matches.push({ name, startLine, endLine })
  }

  function visit(node: import('typescript').Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      addName(node.name.text, node)
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      addName(node.name.text, node)
    }

    if (ts.isFunctionExpression(node) && node.name) {
      addName(node.name.text, node)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return matches
}
