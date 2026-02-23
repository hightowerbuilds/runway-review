import type { CodeLanguage } from '../../code-processing'

import '../ModalBase/ModalBase.css'
import './NewPageModal.css'

type NewPageModalProps = {
  isOpen: boolean
  language: CodeLanguage
  onSetLanguage: (language: CodeLanguage) => void
  onCreate: () => void
  onCancel: () => void
}

export function NewPageModal({ isOpen, language, onSetLanguage, onCreate, onCancel }: NewPageModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Choose language">
      <div className="auth-card">
        <h2>Choose File Language</h2>
        <p>Select a language before creating this new file.</p>
        <div className="auth-mode-row">
          <button
            type="button"
            className={language === 'html' ? 'auth-mode-button is-active' : 'auth-mode-button'}
            onClick={() => onSetLanguage('html')}
          >
            HTML
          </button>
          <button
            type="button"
            className={language === 'css' ? 'auth-mode-button is-active' : 'auth-mode-button'}
            onClick={() => onSetLanguage('css')}
          >
            CSS
          </button>
          <button
            type="button"
            className={language === 'tsx' ? 'auth-mode-button is-active' : 'auth-mode-button'}
            onClick={() => onSetLanguage('tsx')}
          >
            TSX
          </button>
        </div>
        <button type="button" className="auth-submit-button" onClick={onCreate}>
          Create File
        </button>
        <button type="button" className="auth-cancel-button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  )
}
