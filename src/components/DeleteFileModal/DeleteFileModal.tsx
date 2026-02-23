import '../ModalBase/ModalBase.css'
import './DeleteFileModal.css'

type DeleteFileModalProps = {
  isOpen: boolean
  filename: string
  onDelete: () => void
  onCancel: () => void
}

export function DeleteFileModal({ isOpen, filename, onDelete, onCancel }: DeleteFileModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Delete file">
      <div className="auth-card">
        <h2>Delete File?</h2>
        <p>
          This will permanently delete <strong>{filename}</strong>.
        </p>
        <button type="button" className="auth-submit-button auth-submit-danger" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="auth-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
