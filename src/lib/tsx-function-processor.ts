export type NamedFunctionMatch = {
  name: string
  startLine: number
  endLine: number
}

export type StateDeclarationMatch = {
  name: string
  line: number
}

export type HookCallMatch = {
  name: string
  line: number
}

export type DataTypeMatch = {
  typeName: string
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

export async function extractHookCallsFromTsx(
  code: string,
): Promise<HookCallMatch[]> {
  const ts = await import('typescript')
  const sourceFile = ts.createSourceFile(
    'file.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const matches: HookCallMatch[] = []
  const seen = new Set<string>()

  function isHookName(name: string) {
    return /^use[A-Z0-9_]/.test(name)
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

  function visit(node: import('typescript').Node) {
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && isHookName(node.expression.text)) {
        addMatch(node.expression.text, node.expression)
      }

      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.name) &&
        isHookName(node.expression.name.text)
      ) {
        addMatch(node.expression.name.text, node.expression.name)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return matches
}

export async function extractDataTypesFromTsx(
  code: string,
): Promise<DataTypeMatch[]> {
  const ts = await import('typescript')
  const sourceFile = ts.createSourceFile(
    'file.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const matches: DataTypeMatch[] = []
  const seen = new Set<string>()

  function addMatch(typeName: string, node: import('typescript').Node) {
    const cleanTypeName = typeName.trim().replace(/\s+/g, ' ')
    if (!cleanTypeName) {
      return
    }

    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
    const key = `${cleanTypeName}:${line}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    matches.push({ typeName: cleanTypeName, line })
  }

  function inferFromInitializer(
    initializer: import('typescript').Expression,
  ): string | null {
    if (
      ts.isStringLiteral(initializer) ||
      ts.isNoSubstitutionTemplateLiteral(initializer) ||
      ts.isTemplateExpression(initializer)
    ) {
      return 'string'
    }

    if (ts.isNumericLiteral(initializer)) {
      return 'number'
    }

    if (initializer.kind === ts.SyntaxKind.TrueKeyword || initializer.kind === ts.SyntaxKind.FalseKeyword) {
      return 'boolean'
    }

    if (initializer.kind === ts.SyntaxKind.NullKeyword) {
      return 'null'
    }

    if (ts.isArrayLiteralExpression(initializer)) {
      return 'array'
    }

    if (ts.isObjectLiteralExpression(initializer)) {
      return 'object'
    }

    if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
      return 'function'
    }

    if (ts.isIdentifier(initializer) && initializer.text === 'undefined') {
      return 'undefined'
    }

    return null
  }

  function visit(node: import('typescript').Node) {
    if (ts.isTypeNode(node)) {
      addMatch(node.getText(sourceFile), node)
    }

    if (ts.isVariableDeclaration(node) && !node.type && node.initializer) {
      const inferred = inferFromInitializer(node.initializer)
      if (inferred) {
        addMatch(inferred, node.initializer)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return matches
}
