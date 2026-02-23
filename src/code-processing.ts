export type CodeLanguage = 'html' | 'css' | 'tsx'

export type CodeDocument = {
  pageNumber: number
  filename?: string
  code: string
  language: CodeLanguage
  updatedAt: string
}

export type CodeProcessingSnapshot = {
  version: 1
  documents: CodeDocument[]
  updatedAt: string
}

export function isCodeLanguage(value: string): value is CodeLanguage {
  return value === 'html' || value === 'css' || value === 'tsx'
}

export function getCodeFileExtension(language: CodeLanguage) {
  if (language === 'html') {
    return 'html'
  }

  if (language === 'css') {
    return 'css'
  }

  return 'tsx'
}

export function buildDefaultPageCode(pageNumber: number, language: CodeLanguage = 'tsx') {
  if (language === 'html') {
    return (
      '<!doctype html>\n' +
      '<html lang="en">\n' +
      '  <head>\n' +
      `    <title>Page ${pageNumber}</title>\n` +
      '  </head>\n' +
      '  <body>\n' +
      `    <main>Page ${pageNumber}</main>\n` +
      '  </body>\n' +
      '</html>\n'
    )
  }

  if (language === 'css') {
    return (
      `/* Page ${pageNumber} */\n` +
      '.page {\n' +
      '  display: block;\n' +
      '  padding: 1rem;\n' +
      '}\n'
    )
  }

  return (
    `// Page ${pageNumber}\n` +
    'export default function Page() {\n' +
    `  return 'Page ${pageNumber}'\n` +
    '}\n'
  )
}
