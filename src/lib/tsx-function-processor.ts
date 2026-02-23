export type NamedFunctionMatch = {
  name: string
  startLine: number
  endLine: number
}

export type StateDeclarationMatch = {
  name: string
  line: number
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

export async function extractStateDeclarationsFromTsx(
  code: string,
): Promise<StateDeclarationMatch[]> {
  const ts = await import('typescript')
  const sourceFile = ts.createSourceFile(
    'file.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const matches: StateDeclarationMatch[] = []
  const seen = new Set<string>()

  function isUseStateCall(node: import('typescript').CallExpression) {
    if (ts.isIdentifier(node.expression)) {
      return node.expression.text === 'useState'
    }

    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.name)
    ) {
      return node.expression.name.text === 'useState'
    }

    return false
  }

  function addMatch(name: string, node: import('typescript').Node) {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    const key = `${name}:${line}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    matches.push({ name, line })
  }

  function collectStateNamesFromDeclarationName(
    nameNode: import('typescript').BindingName | import('typescript').Identifier,
  ): Array<{ name: string; node: import('typescript').Node }> {
    if (ts.isIdentifier(nameNode)) {
      return [{ name: nameNode.text, node: nameNode }]
    }

    if (ts.isArrayBindingPattern(nameNode)) {
      const first = nameNode.elements[0]
      if (first && ts.isBindingElement(first) && ts.isIdentifier(first.name)) {
        return [{ name: first.name.text, node: first.name }]
      }
      return []
    }

    if (ts.isObjectBindingPattern(nameNode)) {
      return nameNode.elements
        .filter(
          (element): element is import('typescript').BindingElement =>
            ts.isBindingElement(element) && ts.isIdentifier(element.name),
        )
        .map((element) => ({ name: element.name.text, node: element.name }))
    }

    return []
  }

  function visit(node: import('typescript').Node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      isUseStateCall(node.initializer)
    ) {
      const stateNames = collectStateNamesFromDeclarationName(node.name)
      stateNames.forEach((item) => addMatch(item.name, item.node))
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return matches
}
