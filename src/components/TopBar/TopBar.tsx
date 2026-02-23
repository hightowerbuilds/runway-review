import './TopBar.css'

type TopBarProps = {
  isSidebarOpen: boolean
  canReviewCode: boolean
  currentPageNumber: number | null
  hasReachedLimit: boolean
  openPages: number[]
  currentOpenPageNumber: number | null
  workspaceId: string
  isSupabaseReady: boolean
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'
  getPageFilename: (pageNumber: number) => string
  onToggleSidebar: () => void
  onOpenReview: () => void
  onOpenProcessor: () => void
  onRequestAddPage: () => void
  onSaveWorkspace: () => void
  onOpenFile: (pageNumber: number) => void
  onCloseWindow: (pageNumber: number) => void
  onEditUser: () => void
}

export function TopBar({
  isSidebarOpen,
  canReviewCode,
  currentPageNumber,
  hasReachedLimit,
  openPages,
  currentOpenPageNumber,
  workspaceId,
  isSupabaseReady,
  syncStatus,
  getPageFilename,
  onToggleSidebar,
  onOpenReview,
  onOpenProcessor,
  onRequestAddPage,
  onSaveWorkspace,
  onOpenFile,
  onCloseWindow,
  onEditUser,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className={isSidebarOpen ? 'sidebar-toggle-button is-open' : 'sidebar-toggle-button'}
          onClick={onToggleSidebar}
        >
          {isSidebarOpen ? 'Hide Files' : 'Files'}
        </button>
        <button type="button" className="review-code-button" onClick={onOpenReview} disabled={!canReviewCode}>
          Review Code
        </button>
        <button
          type="button"
          className="code-processor-button"
          onClick={onOpenProcessor}
          disabled={!currentPageNumber}
        >
          Code Processor
        </button>
        <button
          type="button"
          className="new-page-button"
          onClick={onRequestAddPage}
          disabled={hasReachedLimit}
        >
          {hasReachedLimit ? 'All Pages Added' : 'New Page'}
        </button>
        <button
          type="button"
          className="save-code-button"
          onClick={onSaveWorkspace}
          disabled={!workspaceId || !isSupabaseReady || syncStatus === 'saving'}
        >
          Save
        </button>
      </div>
      <div className="topbar-tabs" aria-label="Open windows">
        {openPages.length === 0 ? (
          <span className="window-tabs-empty">No open windows</span>
        ) : (
          openPages.map((pageNumber) => (
            <div
              key={pageNumber}
              className={currentOpenPageNumber === pageNumber ? 'window-tab is-active' : 'window-tab'}
            >
              <button type="button" className="window-tab-link" onClick={() => onOpenFile(pageNumber)}>
                {getPageFilename(pageNumber)}
              </button>
              <button
                type="button"
                className="window-tab-close"
                aria-label={`Close ${getPageFilename(pageNumber)}`}
                onClick={() => onCloseWindow(pageNumber)}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
      <div className="topbar-user">
        <span className="topbar-username">{workspaceId ? `@${workspaceId}` : 'No user'}</span>
        <button type="button" className="topbar-user-edit" onClick={onEditUser}>
          Edit
        </button>
      </div>
    </header>
  )
}
