import '../ModalBase/ModalBase.css'
import './UnsavedModal.css'

type UnsavedModalProps = {
  isOpen: boolean
  onSave: () => void
  onCancel: () => void
}

export function UnsavedModal({ isOpen, onSave, onCancel }: UnsavedModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Unsaved code">
      <div className="auth-card">
        <h2>Save Code?</h2>
        <p>You pasted code into the editor. Save now to enable auto-save.</p>
        <div className="unsaved-actions">
          <button type="button" className="auth-submit-button" onClick={onSave}>
            Save
          </button>
          <span className="unsaved-flag">CODE UNSAVED</span>
        </div>
        <button type="button" className="auth-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
