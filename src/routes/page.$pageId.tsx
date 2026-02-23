import { createFileRoute } from '@tanstack/react-router'
import { MAX_GHOST_PAGES, usePageRegistry } from '../page-registry'
import { useCodeProcessingStore } from '../state/code-processing-store'

export const Route = createFileRoute('/page/$pageId')({
  component: PageRoute,
})

function PageRoute() {
  const { pageId } = Route.useParams()
  const pageNumber = Number(pageId)
  const { isPageActive } = usePageRegistry()

  const isValidPage = Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= MAX_GHOST_PAGES

  if (!isValidPage) {
    return (
      <section className="page-card">
        <h1>Invalid page</h1>
        <p>Page IDs must be between 1 and {MAX_GHOST_PAGES}.</p>
      </section>
    )
  }

  if (!isPageActive(pageNumber)) {
    return (
      <section className="page-card">
        <h1>Page {pageNumber} is not active yet</h1>
        <p>Use the New Page button in the navbar to activate this ghost page.</p>
      </section>
    )
  }

  return <PageEditor pageNumber={pageNumber} />
}

function PageEditor({ pageNumber }: { pageNumber: number }) {
  const { getPageCode, getPageFilename, setPageCode } = useCodeProcessingStore()
  const code = getPageCode(pageNumber)

  return (
    <section className="sandbox-page">
      <div className="editor-shell">
        <div className="editor-toolbar">
          <span>{getPageFilename(pageNumber)}</span>
        </div>
        <textarea
          className="code-editor"
          spellCheck={false}
          value={code}
          onPaste={() => {
            window.dispatchEvent(
              new CustomEvent('runway:editor-paste', { detail: { pageNumber } }),
            )
          }}
          onChange={(event) => setPageCode(pageNumber, event.target.value)}
        />
      </div>
    </section>
  )
}
