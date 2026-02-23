import '../ModalBase/ModalBase.css'
import './AuthModal.css'

type AuthModalProps = {
  isOpen: boolean
  workspaceId: string
  authMode: 'login' | 'new'
  authUsername: string
  authError: string
  isAuthBusy: boolean
  isSupabaseReady: boolean
  onSetMode: (mode: 'login' | 'new') => void
  onSetUsername: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AuthModal({
  isOpen,
  workspaceId,
  authMode,
  authUsername,
  authError,
  isAuthBusy,
  isSupabaseReady,
  onSetMode,
  onSetUsername,
  onSubmit,
  onCancel,
}: AuthModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="User login">
      <div className="auth-card">
        <h2>{workspaceId ? 'Change Username' : 'Workspace Access'}</h2>
        <p>Use a username to load and save your code workspace.</p>
        <div className="auth-mode-row">
          <button
            type="button"
            className={authMode === 'login' ? 'auth-mode-button is-active' : 'auth-mode-button'}
            onClick={() => onSetMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={authMode === 'new' ? 'auth-mode-button is-active' : 'auth-mode-button'}
            onClick={() => onSetMode('new')}
          >
            New User
          </button>
        </div>
        <label htmlFor="auth-username" className="sidebar-label">
          Username
        </label>
        <input
          id="auth-username"
          className="auth-input"
          autoComplete="off"
          value={authUsername}
          onChange={(event) => onSetUsername(event.target.value)}
          placeholder="enter username"
        />
        {authError ? <p className="auth-error">{authError}</p> : null}
        <button
          type="button"
          className="auth-submit-button"
          disabled={isAuthBusy || !isSupabaseReady}
          onClick={onSubmit}
        >
          {isAuthBusy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create User'}
        </button>
        {workspaceId ? (
          <button type="button" className="auth-cancel-button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
        {!isSupabaseReady ? <p className="auth-error">Supabase env is missing. Configure `.env` first.</p> : null}
      </div>
    </section>
  )
}
