import type {
  NamedFunctionMatch,
  StateDeclarationMatch,
} from '../../lib/tsx-function-processor'

import '../ModalBase/ModalBase.css'
import './ProcessorModal.css'

type ProcessorModalProps = {
  isOpen: boolean
  message: string
  lineCount: number
  functions: NamedFunctionMatch[]
  stateDeclarations: StateDeclarationMatch[]
  onClose: () => void
}

export function ProcessorModal({
  isOpen,
  message,
  lineCount,
  functions,
  stateDeclarations,
  onClose,
}: ProcessorModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Code processor">
      <div className="auth-card">
        <h2>Code Processor</h2>
        <p>{message}</p>
        <p className="processor-line-count">
          Total lines: <strong>{lineCount}</strong>
        </p>
        {functions.length > 0 ? (
          <ol className="processor-list">
            {functions.map((fn) => (
              <li key={`${fn.name}-${fn.startLine}-${fn.endLine}`} className="processor-item">
                <span className="processor-name">{fn.name}</span>
                <span className="processor-line">
                  lines {fn.startLine}
                  {fn.endLine !== fn.startLine ? `-${fn.endLine}` : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <h3 className="processor-subheading">State Declarations</h3>
        {stateDeclarations.length > 0 ? (
          <ol className="processor-list">
            {stateDeclarations.map((stateItem) => (
              <li key={`${stateItem.name}-${stateItem.line}`} className="processor-item">
                <span className="processor-name">{stateItem.name}</span>
                <span className="processor-line">line {stateItem.line}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="processor-empty">No `useState` declarations found.</p>
        )}
        <button type="button" className="auth-cancel-button" onClick={onClose}>
          Close
        </button>
      </div>
    </section>
  )
}
