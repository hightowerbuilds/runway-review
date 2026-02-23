import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import {
  buildDefaultPageCode,
  getCodeFileExtension,
  isCodeLanguage,
  type CodeLanguage,
  type CodeDocument,
  type CodeProcessingSnapshot,
} from '../code-processing'
import {
  isSupabaseConfigured,
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
} from '../lib/supabase-rest'

const LOCAL_STORAGE_KEY = 'runway.code-processing.snapshot.v1'

type CodeProcessingState = {
  documentsByPage: Record<number, CodeDocument>
  revision: number
  syncStatus: 'idle' | 'saving' | 'error'
  syncError: string | null
  lastSavedAt: string | null
}

type CodeProcessingContextValue = {
  getPageCode: (pageNumber: number) => string
  getPageLanguage: (pageNumber: number) => CodeLanguage
  getPageFilename: (pageNumber: number) => string
  setPageCode: (pageNumber: number, code: string) => void
  setPageLanguage: (pageNumber: number, language: CodeLanguage) => void
  setPageFilename: (pageNumber: number, filename: string) => void
  removePageCode: (pageNumber: number) => void
  clearAllCode: () => void
  exportSnapshot: () => CodeProcessingSnapshot
  importSnapshot: (snapshot: CodeProcessingSnapshot) => void
  revision: number
  syncStatus: CodeProcessingState['syncStatus']
  syncError: string | null
  lastSavedAt: string | null
  isSupabaseReady: boolean
  saveToSupabase: (workspaceId: string) => Promise<{ ok: boolean; error?: string }>
  loadFromSupabase: (
    workspaceId: string,
  ) => Promise<{ ok: boolean; snapshot?: CodeProcessingSnapshot | null; error?: string }>
}

type Action =
  | { type: 'set_page_code'; pageNumber: number; code: string }
  | { type: 'set_page_language'; pageNumber: number; language: CodeLanguage }
  | { type: 'set_page_filename'; pageNumber: number; filename: string }
  | { type: 'remove_page_code'; pageNumber: number }
  | { type: 'clear_all_code' }
  | { type: 'import_snapshot'; snapshot: CodeProcessingSnapshot }
  | { type: 'sync_started' }
  | { type: 'sync_success' }
  | { type: 'sync_error'; error: string }

const CodeProcessingContext = createContext<CodeProcessingContextValue | null>(null)

function toSnapshot(state: CodeProcessingState): CodeProcessingSnapshot {
  const documents = Object.values(state.documentsByPage).sort(
    (a, b) => a.pageNumber - b.pageNumber,
  )

  return {
    version: 1,
    documents,
    updatedAt: new Date().toISOString(),
  }
}

function fromSnapshot(snapshot: CodeProcessingSnapshot): Record<number, CodeDocument> {
  const documentsByPage: Record<number, CodeDocument> = {}
  for (const document of snapshot.documents) {
    const safeLanguage = isCodeLanguage((document as { language?: string }).language ?? '')
      ? document.language
      : 'tsx'
    documentsByPage[document.pageNumber] = {
      pageNumber: document.pageNumber,
      filename:
        typeof (document as { filename?: unknown }).filename === 'string'
          ? (document as { filename?: string }).filename
          : undefined,
      code: document.code,
      language: safeLanguage,
      updatedAt: document.updatedAt,
    }
  }
  return documentsByPage
}

function reducer(state: CodeProcessingState, action: Action): CodeProcessingState {
  switch (action.type) {
    case 'set_page_code': {
      const now = new Date().toISOString()
      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: {
          ...state.documentsByPage,
          [action.pageNumber]: {
            pageNumber: action.pageNumber,
            filename: state.documentsByPage[action.pageNumber]?.filename,
            code: action.code,
            language: state.documentsByPage[action.pageNumber]?.language ?? 'tsx',
            updatedAt: now,
          },
        },
      }
    }
    case 'set_page_language': {
      const now = new Date().toISOString()
      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: {
          ...state.documentsByPage,
          [action.pageNumber]: {
            pageNumber: action.pageNumber,
            filename: state.documentsByPage[action.pageNumber]?.filename,
            code:
              state.documentsByPage[action.pageNumber]?.code ??
              buildDefaultPageCode(action.pageNumber, action.language),
            language: action.language,
            updatedAt: now,
          },
        },
      }
    }
    case 'set_page_filename': {
      const now = new Date().toISOString()
      const trimmedName = action.filename.trim()
      if (!trimmedName) {
        return state
      }

      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: {
          ...state.documentsByPage,
          [action.pageNumber]: {
            pageNumber: action.pageNumber,
            filename: trimmedName,
            code:
              state.documentsByPage[action.pageNumber]?.code ??
              buildDefaultPageCode(
                action.pageNumber,
                state.documentsByPage[action.pageNumber]?.language ?? 'tsx',
              ),
            language: state.documentsByPage[action.pageNumber]?.language ?? 'tsx',
            updatedAt: now,
          },
        },
      }
    }
    case 'remove_page_code': {
      const nextDocumentsByPage = { ...state.documentsByPage }
      delete nextDocumentsByPage[action.pageNumber]
      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: nextDocumentsByPage,
      }
    }
    case 'clear_all_code':
      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: {},
      }
    case 'import_snapshot':
      return {
        ...state,
        revision: state.revision + 1,
        documentsByPage: fromSnapshot(action.snapshot),
      }
    case 'sync_started':
      return { ...state, syncStatus: 'saving', syncError: null }
    case 'sync_success':
      return {
        ...state,
        syncStatus: 'idle',
        syncError: null,
        lastSavedAt: new Date().toISOString(),
      }
    case 'sync_error':
      return { ...state, syncStatus: 'error', syncError: action.error }
    default:
      return state
  }
}

function loadStoredSnapshot(): CodeProcessingSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as CodeProcessingSnapshot
    if (parsed.version !== 1 || !Array.isArray(parsed.documents)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function CodeProcessingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    documentsByPage: {},
    revision: 0,
    syncStatus: 'idle',
    syncError: null,
    lastSavedAt: null,
  })

  useEffect(() => {
    const storedSnapshot = loadStoredSnapshot()
    if (!storedSnapshot) {
      return
    }

    dispatch({ type: 'import_snapshot', snapshot: storedSnapshot })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(toSnapshot(state)))
  }, [state])

  const value = useMemo<CodeProcessingContextValue>(
    () => ({
      getPageCode: (pageNumber) =>
        state.documentsByPage[pageNumber]?.code ??
        buildDefaultPageCode(pageNumber, state.documentsByPage[pageNumber]?.language ?? 'tsx'),
      getPageLanguage: (pageNumber) =>
        state.documentsByPage[pageNumber]?.language ?? 'tsx',
      getPageFilename: (pageNumber) => {
        const language = state.documentsByPage[pageNumber]?.language ?? 'tsx'
        return (
          state.documentsByPage[pageNumber]?.filename ??
          `page-${pageNumber}.${getCodeFileExtension(language)}`
        )
      },
      setPageCode: (pageNumber, code) => {
        dispatch({ type: 'set_page_code', pageNumber, code })
      },
      setPageLanguage: (pageNumber, language) => {
        dispatch({ type: 'set_page_language', pageNumber, language })
      },
      setPageFilename: (pageNumber, filename) => {
        dispatch({ type: 'set_page_filename', pageNumber, filename })
      },
      removePageCode: (pageNumber) => {
        dispatch({ type: 'remove_page_code', pageNumber })
      },
      clearAllCode: () => {
        dispatch({ type: 'clear_all_code' })
      },
      exportSnapshot: () => toSnapshot(state),
      importSnapshot: (snapshot) => {
        dispatch({ type: 'import_snapshot', snapshot })
      },
      revision: state.revision,
      syncStatus: state.syncStatus,
      syncError: state.syncError,
      lastSavedAt: state.lastSavedAt,
      isSupabaseReady: isSupabaseConfigured(),
      saveToSupabase: async (workspaceId) => {
        dispatch({ type: 'sync_started' })
        const response = await saveWorkspaceSnapshot({
          workspaceId,
          snapshot: toSnapshot(state),
        })

        if (!response.ok) {
          dispatch({ type: 'sync_error', error: response.error })
          return { ok: false, error: response.error }
        }

        dispatch({ type: 'sync_success' })
        return { ok: true }
      },
      loadFromSupabase: async (workspaceId) => {
        dispatch({ type: 'sync_started' })
        const response = await loadWorkspaceSnapshot(workspaceId)

        if (!response.ok) {
          dispatch({ type: 'sync_error', error: response.error })
          return { ok: false, error: response.error }
        }

        if (response.snapshot) {
          dispatch({ type: 'import_snapshot', snapshot: response.snapshot })
        }
        dispatch({ type: 'sync_success' })
        return { ok: true, snapshot: response.snapshot }
      },
    }),
    [state],
  )

  return (
    <CodeProcessingContext.Provider value={value}>
      {children}
    </CodeProcessingContext.Provider>
  )
}

export function useCodeProcessingStore() {
  const context = useContext(CodeProcessingContext)
  if (!context) {
    throw new Error('useCodeProcessingStore must be used within CodeProcessingProvider')
  }
  return context
}
