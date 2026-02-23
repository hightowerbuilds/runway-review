import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const MAX_GHOST_PAGES = 10

type PageRegistryValue = {
  activePages: number[]
  addNextPage: () => number | null
  removePage: (pageNumber: number) => void
  setActivePages: (pages: number[]) => void
  isPageActive: (pageNumber: number) => boolean
}

const STORAGE_KEY = 'runway.active-pages'

const PageRegistryContext = createContext<PageRegistryValue | null>(null)

function normalizePages(input: unknown): number[] {
  if (!Array.isArray(input)) {
    return []
  }

  const uniquePages = new Set<number>()
  for (const value of input) {
    const page = Number(value)
    if (Number.isInteger(page) && page >= 1 && page <= MAX_GHOST_PAGES) {
      uniquePages.add(page)
    }
  }

  return [...uniquePages].sort((a, b) => a - b)
}

export function PageRegistryProvider({ children }: { children: ReactNode }) {
  const [activePages, setActivePages] = useState<number[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    if (!storedValue) {
      return
    }

    try {
      const parsedValue = JSON.parse(storedValue)
      setActivePages(normalizePages(parsedValue))
    } catch {
      setActivePages([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activePages))
  }, [activePages])

  const addNextPage = useCallback(() => {
    const nextPage = Array.from({ length: MAX_GHOST_PAGES }, (_, index) => index + 1).find(
      (page) => !activePages.includes(page),
    )

    if (!nextPage) {
      return null
    }

    setActivePages((previousPages) => [...previousPages, nextPage].sort((a, b) => a - b))
    return nextPage
  }, [activePages])

  const isPageActive = useCallback(
    (pageNumber: number) => activePages.includes(pageNumber),
    [activePages],
  )

  const removePage = useCallback((pageNumber: number) => {
    setActivePages((previousPages) =>
      previousPages.filter((page) => page !== pageNumber),
    )
  }, [])

  const replaceActivePages = useCallback((pages: number[]) => {
    setActivePages(normalizePages(pages))
  }, [])

  const value = useMemo(
    () => ({
      activePages,
      addNextPage,
      removePage,
      setActivePages: replaceActivePages,
      isPageActive,
    }),
    [activePages, addNextPage, removePage, replaceActivePages, isPageActive],
  )

  return <PageRegistryContext.Provider value={value}>{children}</PageRegistryContext.Provider>
}

export function usePageRegistry() {
  const context = useContext(PageRegistryContext)
  if (!context) {
    throw new Error('usePageRegistry must be used within a PageRegistryProvider')
  }

  return context
}
