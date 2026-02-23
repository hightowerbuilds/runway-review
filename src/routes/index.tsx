import { createFileRoute } from '@tanstack/react-router'
import { MAX_GHOST_PAGES, usePageRegistry } from '../page-registry'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const { activePages } = usePageRegistry()

  return (
    <section className="page-card">
      <h1>Route Generation Prototype</h1>
      <p>Click New Page in the navbar to activate ghost routes one by one.</p>
      <p>
        Active pages: <strong>{activePages.length}</strong> of <strong>{MAX_GHOST_PAGES}</strong>
      </p>
    </section>
  )
}
