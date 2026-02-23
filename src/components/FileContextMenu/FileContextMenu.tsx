import './FileContextMenu.css'

type FileContextMenuProps = {
  x: number
  y: number
  onDeleteFile: () => void
}

export function FileContextMenu({ x, y, onDeleteFile }: FileContextMenuProps) {
  return (
    <div className="file-context-menu" style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="file-context-delete" onClick={onDeleteFile}>
        Delete File
      </button>
    </div>
  )
}
