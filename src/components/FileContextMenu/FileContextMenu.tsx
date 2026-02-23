import './FileContextMenu.css'

type FileContextMenuProps = {
  x: number
  y: number
  onRenameFile: () => void
  onDeleteFile: () => void
}

export function FileContextMenu({ x, y, onRenameFile, onDeleteFile }: FileContextMenuProps) {
  return (
    <div className="file-context-menu" style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="file-context-action" onClick={onRenameFile}>
        Rename File
      </button>
      <button type="button" className="file-context-delete" onClick={onDeleteFile}>
        Delete File
      </button>
    </div>
  )
}
