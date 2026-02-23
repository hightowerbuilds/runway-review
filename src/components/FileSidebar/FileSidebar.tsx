import { Link } from '@tanstack/react-router'

import './FileSidebar.css'

type FileSidebarProps = {
  isOpen: boolean
  activePages: number[]
  hasReachedLimit: boolean
  onRequestAddPage: () => void
  onOpenFile: (pageNumber: number) => void
  onOpenContextMenu: (args: { pageNumber: number; x: number; y: number }) => void
  onClearContextMenu: () => void
  getPageFilename: (pageNumber: number) => string
}

export function FileSidebar({
  isOpen,
  activePages,
  hasReachedLimit,
  onRequestAddPage,
  onOpenFile,
  onOpenContextMenu,
  onClearContextMenu,
  getPageFilename,
}: FileSidebarProps) {
  return (
    <aside className={isOpen ? 'file-sidebar is-open' : 'file-sidebar'}>
      <div className="sidebar-header-row">
        <strong>Files</strong>
        <button
          type="button"
          className="sidebar-button is-secondary"
          onClick={onRequestAddPage}
          disabled={hasReachedLimit}
        >
          + New
        </button>
      </div>
      <nav className="sidebar-files" aria-label="Code files">
        {activePages.length === 0 ? (
          <p className="sidebar-meta">No active files yet.</p>
        ) : (
          activePages.map((pageNumber) => (
            <div key={pageNumber} className="file-row">
              <Link
                to="/page/$pageId"
                params={{ pageId: String(pageNumber) }}
                className="file-link"
                activeProps={{ className: 'file-link is-active' }}
                onClick={(event) => {
                  event.preventDefault()
                  onOpenFile(pageNumber)
                  onClearContextMenu()
                }}
                onContextMenu={(event) => {
                  event.preventDefault()
                  onOpenContextMenu({
                    pageNumber,
                    x: event.clientX,
                    y: event.clientY,
                  })
                }}
              >
                {getPageFilename(pageNumber)}
              </Link>
            </div>
          ))
        )}
      </nav>
    </aside>
  )
}
