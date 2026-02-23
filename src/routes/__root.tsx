import {
  HeadContent,
  Scripts,
  createRootRoute,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { AuthModal } from '../components/AuthModal/AuthModal'
import { DeleteFileModal } from '../components/DeleteFileModal/DeleteFileModal'
import { FileContextMenu } from '../components/FileContextMenu/FileContextMenu'
import { FileSidebar } from '../components/FileSidebar/FileSidebar'
import { NewPageModal } from '../components/NewPageModal/NewPageModal'
import { ProcessorModal } from '../components/ProcessorModal/ProcessorModal'
import { ReviewModal } from '../components/ReviewModal/ReviewModal'
import { TopBar } from '../components/TopBar/TopBar'
import { UnsavedModal } from '../components/UnsavedModal/UnsavedModal'
import appCss from '../styles/index.css?url'
import {
  MAX_GHOST_PAGES,
  PageRegistryProvider,
  usePageRegistry,
} from '../page-registry'
import { loadWorkspaceSnapshot } from '../lib/supabase-rest'
import {
  extractNamedFunctionsFromTsx,
  type NamedFunctionMatch,
} from '../lib/tsx-function-processor'
import { CodeProcessingProvider, useCodeProcessingStore } from '../state/code-processing-store'
import type { CodeLanguage, CodeProcessingSnapshot } from '../code-processing'

const AUTO_SCROLL_SPEED_PX_PER_SECOND = 26
const AUTO_SCROLL_RESUME_DELAY_MS = 250
const READOUT_TAIL_PROGRESS_PER_SECOND = 0.42
const SCANLINE_TAIL_SPEED_PX_PER_SECOND = 28
const USERNAME_STORAGE_KEY = 'runway.username'

function getFunctionKey(fn: NamedFunctionMatch) {
  return `${fn.name}-${fn.startLine}-${fn.endLine}`
}

function getFunctionReadoutText(fn: NamedFunctionMatch) {
  return (
    `Function ${fn.name} spans lines ${fn.startLine}-${fn.endLine}. ` +
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor ' +
    'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud ' +
    'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure ' +
    'dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Runway Review',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PageRegistryProvider>
          <CodeProcessingProvider>
            <AppLayout>{children}</AppLayout>
          </CodeProcessingProvider>
        </PageRegistryProvider>
        <Scripts />
      </body>
    </html>
  )
}

function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { activePages, addNextPage, removePage, setActivePages } = usePageRegistry()
  const {
    getPageCode,
    getPageLanguage,
    getPageFilename,
    setPageLanguage,
    removePageCode,
    clearAllCode,
    exportSnapshot,
    saveToSupabase,
    loadFromSupabase,
    revision,
    syncStatus,
    syncError,
    lastSavedAt,
    isSupabaseReady,
  } = useCodeProcessingStore()
  const hasReachedLimit = activePages.length >= MAX_GHOST_PAGES
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [workspaceId, setWorkspaceId] = useState('')
  const [workspaceInput, setWorkspaceInput] = useState('')
  const [workspaceMessage, setWorkspaceMessage] = useState('')
  const [openPages, setOpenPages] = useState<number[]>([])
  const [fileContextMenu, setFileContextMenu] = useState<{
    pageNumber: number
    x: number
    y: number
  } | null>(null)
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<number | null>(null)
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false)
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false)
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false)
  const [newPageLanguage, setNewPageLanguage] = useState<CodeLanguage>('tsx')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'new'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isProcessorModalOpen, setIsProcessorModalOpen] = useState(false)
  const [processedFunctions, setProcessedFunctions] = useState<NamedFunctionMatch[]>([])
  const [processedLineCount, setProcessedLineCount] = useState(0)
  const [processorMessage, setProcessorMessage] = useState('')
  const [reviewCode, setReviewCode] = useState('')
  const [reviewFunctions, setReviewFunctions] = useState<NamedFunctionMatch[]>([])
  const [activeReviewFunctionKey, setActiveReviewFunctionKey] = useState<string | null>(null)
  const [functionOverlayRects, setFunctionOverlayRects] = useState<
    Record<string, { top: number; height: number }>
  >({})
  const [functionReadoutProgress, setFunctionReadoutProgress] = useState<
    Record<string, number>
  >({})
  const [scanlineExtent, setScanlineExtent] = useState<{ top: number; height: number } | null>(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const reviewViewportRef = useRef<HTMLDivElement | null>(null)
  const reviewCodeLineRef = useRef<HTMLOListElement | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number | null>(null)
  const resumeTimerRef = useRef<number | null>(null)
  const autoScrollEnabledRef = useRef(false)
  const lastSyncedRevisionRef = useRef<number>(0)
  const currentPageNumber = useMemo(() => {
    const match = pathname.match(/^\/page\/(\d+)$/)
    if (!match) {
      return null
    }

    const value = Number(match[1])
    return Number.isInteger(value) ? value : null
  }, [pathname])
  const canReviewCode = currentPageNumber !== null && activePages.includes(currentPageNumber)
  const reviewLines = useMemo(() => reviewCode.replace(/\r\n?/g, '\n').split('\n'), [reviewCode])
  const activeReviewFunction = useMemo(
    () =>
      reviewFunctions.find(
        (fn) => activeReviewFunctionKey === `${fn.name}-${fn.startLine}-${fn.endLine}`,
      ) ?? null,
    [activeReviewFunctionKey, reviewFunctions],
  )
  const reviewFunctionByKey = useMemo(() => {
    return reviewFunctions.reduce<Record<string, NamedFunctionMatch>>((accumulator, fn) => {
      accumulator[getFunctionKey(fn)] = fn
      return accumulator
    }, {})
  }, [reviewFunctions])
  const activeFunctionOverlay = activeReviewFunctionKey
    ? (functionOverlayRects[activeReviewFunctionKey] ?? null)
    : null
  const completedReviewFunctionKeys = useMemo(
    () =>
      Object.entries(functionReadoutProgress)
        .filter(([key, progress]) => progress >= 1 && !!functionOverlayRects[key] && !!reviewFunctionByKey[key])
        .map(([key]) => key),
    [functionOverlayRects, functionReadoutProgress, reviewFunctionByKey],
  )
  const activeReadoutProgress = activeReviewFunctionKey
    ? (functionReadoutProgress[activeReviewFunctionKey] ?? 0)
    : 0
  const functionSourceByKey = useMemo(() => {
    return reviewFunctions.reduce<Record<string, string>>((accumulator, fn) => {
      const sliceStart = Math.max(fn.startLine - 1, 0)
      const sliceEnd = Math.max(fn.endLine, sliceStart)
      accumulator[getFunctionKey(fn)] = reviewLines.slice(sliceStart, sliceEnd).join('\n')
      return accumulator
    }, {})
  }, [reviewFunctions, reviewLines])
  const activeFunctionSource = useMemo(() => {
    if (!activeReviewFunctionKey) {
      return ''
    }
    return functionSourceByKey[activeReviewFunctionKey] ?? ''
  }, [activeReviewFunctionKey, functionSourceByKey])
  const activeReadoutText = activeFunctionSource
    ? activeFunctionSource
    : activeReviewFunction
      ? getFunctionReadoutText(activeReviewFunction)
      : ''
  const readoutVisibleText = activeReadoutText.slice(
    0,
    Math.floor(activeReadoutText.length * activeReadoutProgress),
  )
  const reviewOverlays = useMemo(() => {
    const completed = completedReviewFunctionKeys
      .filter((functionKey) => functionKey !== activeReviewFunctionKey)
      .map((functionKey) => {
        const overlayRect = functionOverlayRects[functionKey]
        const completedText = functionSourceByKey[functionKey] ?? ''
        if (!overlayRect || !completedText) {
          return null
        }

        return {
          key: `${functionKey}-completed-overlay`,
          top: overlayRect.top,
          height: overlayRect.height,
          text: completedText,
          isActive: false,
        }
      })
      .filter((overlay): overlay is { key: string; top: number; height: number; text: string; isActive: boolean } => overlay !== null)

    if (activeFunctionOverlay) {
      completed.push({
        key: `${activeReviewFunctionKey ?? 'active'}-active-overlay`,
        top: activeFunctionOverlay.top,
        height: activeFunctionOverlay.height,
        text: readoutVisibleText || '\u00A0',
        isActive: true,
      })
    }

    return completed
  }, [
    activeFunctionOverlay,
    activeReviewFunctionKey,
    completedReviewFunctionKeys,
    functionOverlayRects,
    functionSourceByKey,
    readoutVisibleText,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const savedUsername = window.localStorage.getItem(USERNAME_STORAGE_KEY)
    if (!savedUsername) {
      return
    }

    setWorkspaceId(savedUsername)
    setWorkspaceInput(savedUsername)
    setAuthUsername(savedUsername)
    setIsAuthModalOpen(false)
    setWorkspaceMessage(`Restoring saved workspace for ${savedUsername}...`)
    void handleRestoreForUser(savedUsername)
  }, [])

  function syncPagesFromSnapshot(snapshot: CodeProcessingSnapshot | null | undefined) {
    const pagesFromSnapshot = snapshot
      ? snapshot.documents.map((document) => document.pageNumber)
      : []
    const uniquePages = [...new Set(pagesFromSnapshot)].sort((a, b) => a - b)
    setActivePages(uniquePages)
    setOpenPages(uniquePages)

    if (uniquePages.length === 0 && pathname.startsWith('/page/')) {
      navigate({ to: '/' })
      return
    }

    if (currentPageNumber && !uniquePages.includes(currentPageNumber)) {
      navigate({
        to: '/page/$pageId',
        params: { pageId: String(uniquePages[0]) },
      })
    }
  }

  async function handleUseUsername() {
    const nextWorkspaceId = workspaceInput.trim()
    if (!nextWorkspaceId) {
      setWorkspaceMessage('Enter a username first.')
      return
    }

    setWorkspaceId(nextWorkspaceId)
    setIsAutoSaveEnabled(false)
    window.localStorage.setItem(USERNAME_STORAGE_KEY, nextWorkspaceId)
    setWorkspaceMessage(`Connected as ${nextWorkspaceId}. Restoring code...`)
    await handleRestoreForUser(nextWorkspaceId)
  }

  async function handleRestoreForUser(username: string) {
    const response = await loadFromSupabase(username)
    if (!response.ok) {
      setWorkspaceMessage(`Restore failed: ${response.error ?? 'Unknown error'}`)
      return false
    }

    syncPagesFromSnapshot(response.snapshot)
    const restoredCount = response.snapshot?.documents.length ?? 0
    setWorkspaceMessage(
      restoredCount > 0
        ? `Loaded ${restoredCount} file(s) for ${username}.`
        : `No saved files found for ${username}.`,
    )
    return true
  }

  async function handleSaveWorkspace() {
    if (!workspaceId) {
      setWorkspaceMessage('Set a username before saving.')
      return false
    }

    const response = await saveToSupabase(workspaceId)
    if (!response.ok) {
      setWorkspaceMessage(`Save failed: ${response.error ?? 'Unknown error'}`)
      return false
    }

    syncPagesFromSnapshot(exportSnapshot())
    lastSyncedRevisionRef.current = revision
    setIsAutoSaveEnabled(true)
    setWorkspaceMessage(`Saved successfully for ${workspaceId}.`)
    return true
  }

  async function handleRestoreWorkspace() {
    if (!workspaceId) {
      setWorkspaceMessage('Set a username before restoring.')
      return
    }

    await handleRestoreForUser(workspaceId)
  }

  async function handleLogin() {
    const username = authUsername.trim()
    if (!username) {
      setAuthError('Enter a username.')
      return
    }

    setAuthError('')
    setIsAuthBusy(true)

    const response = await loadFromSupabase(username)
    if (!response.ok) {
      setAuthError(response.error ?? 'Login failed.')
      setIsAuthBusy(false)
      return
    }

    if (!response.snapshot) {
      setAuthError('User not found. Use New User to create one.')
      setIsAuthBusy(false)
      return
    }

    setWorkspaceId(username)
    setWorkspaceInput(username)
    setIsAutoSaveEnabled(false)
    window.localStorage.setItem(USERNAME_STORAGE_KEY, username)
    syncPagesFromSnapshot(response.snapshot)
    setWorkspaceMessage(
      `Logged in as ${username}. Loaded ${response.snapshot.documents.length} file(s).`,
    )
    setIsAuthModalOpen(false)
    setIsAuthBusy(false)
  }

  async function handleCreateUser() {
    const username = authUsername.trim()
    if (!username) {
      setAuthError('Enter a username.')
      return
    }

    setAuthError('')
    setIsAuthBusy(true)

    const existingResponse = await loadWorkspaceSnapshot(username)
    if (!existingResponse.ok) {
      setAuthError(existingResponse.error ?? 'Could not check username.')
      setIsAuthBusy(false)
      return
    }

    if (existingResponse.snapshot) {
      setAuthError('Username already exists. Use Login.')
      setIsAuthBusy(false)
      return
    }

    clearAllCode()
    setActivePages([])
    navigate({ to: '/' })

    setWorkspaceId(username)
    setWorkspaceInput(username)
    setIsAutoSaveEnabled(false)
    window.localStorage.setItem(USERNAME_STORAGE_KEY, username)

    const saveResponse = await saveToSupabase(username)
    if (!saveResponse.ok) {
      setAuthError(saveResponse.error ?? 'Failed to create user workspace.')
      setIsAuthBusy(false)
      return
    }

    setWorkspaceMessage(`Workspace created for ${username}.`)
    setIsAuthModalOpen(false)
    setIsAuthBusy(false)
  }

  function handleRequestAddPage() {
    if (hasReachedLimit) {
      return
    }

    setNewPageLanguage('tsx')
    setIsNewPageModalOpen(true)
  }

  function handleCreatePageWithLanguage(language: CodeLanguage) {
    const pageNumber = addNextPage()
    if (!pageNumber) {
      return
    }

    setPageLanguage(pageNumber, language)
    setOpenPages((previousPages) => [...previousPages, pageNumber])
    navigate({
      to: '/page/$pageId',
      params: { pageId: String(pageNumber) },
    })
    setIsNewPageModalOpen(false)
  }

  function handleCancelNewPage() {
    setIsNewPageModalOpen(false)
  }

  function handleCloseWindow(pageNumber: number) {
    const nextOpenPages = openPages.filter((page) => page !== pageNumber)
    setOpenPages(nextOpenPages)

    if (pathname !== `/page/${pageNumber}`) {
      return
    }

    const fallbackPage = nextOpenPages[nextOpenPages.length - 1]
    if (fallbackPage) {
      navigate({
        to: '/page/$pageId',
        params: { pageId: String(fallbackPage) },
      })
      return
    }

    navigate({ to: '/' })
  }

  function handleDeleteFile(pageNumber: number) {
    const nextOpenPages = openPages.filter((page) => page !== pageNumber)
    removePage(pageNumber)
    removePageCode(pageNumber)
    setOpenPages(nextOpenPages)

    if (pathname !== `/page/${pageNumber}`) {
      return
    }

    const fallbackPage = nextOpenPages[nextOpenPages.length - 1]
    if (fallbackPage) {
      navigate({
        to: '/page/$pageId',
        params: { pageId: String(fallbackPage) },
      })
      return
    }

    navigate({ to: '/' })
  }

  function handleOpenFile(pageNumber: number) {
    setOpenPages((previousPages) => {
      if (previousPages.includes(pageNumber)) {
        return previousPages
      }

      return [...previousPages, pageNumber]
    })

    navigate({
      to: '/page/$pageId',
      params: { pageId: String(pageNumber) },
    })
  }

  async function handleOpenReview() {
    if (!currentPageNumber || !canReviewCode) {
      return
    }

    const code = getPageCode(currentPageNumber)
    const language = getPageLanguage(currentPageNumber)
    setReviewCode(code)
    if (language === 'tsx') {
      const extractedFunctions = await extractNamedFunctionsFromTsx(code)
      setReviewFunctions(extractedFunctions)
    } else {
      setReviewFunctions([])
    }
    setFunctionReadoutProgress({})
    setActiveReviewFunctionKey(null)
    setIsAutoScrolling(true)
    autoScrollEnabledRef.current = true
    setIsReviewOpen(true)
  }

  async function handleProcessCode() {
    if (!currentPageNumber) {
      setProcessorMessage('Open a TSX file window first.')
      setProcessedFunctions([])
      setProcessedLineCount(0)
      setIsProcessorModalOpen(true)
      return
    }

    const language = getPageLanguage(currentPageNumber)
    if (language !== 'tsx') {
      setProcessorMessage('Code Processor currently works only for TSX files.')
      setProcessedFunctions([])
      setProcessedLineCount(0)
      setIsProcessorModalOpen(true)
      return
    }

    const code = getPageCode(currentPageNumber)
    const normalizedCode = code.replace(/\r\n?/g, '\n')
    const lineCount = normalizedCode.length === 0 ? 1 : normalizedCode.split('\n').length
    const names = await extractNamedFunctionsFromTsx(code)
    setProcessedLineCount(lineCount)
    setProcessorMessage(
      names.length === 0
        ? 'No named functions were found in this file.'
        : `Found ${names.length} named function(s).`,
    )
    setProcessedFunctions(names)
    setIsProcessorModalOpen(true)
  }

  function pauseAutoScrollForInteraction() {
    autoScrollEnabledRef.current = false
    setIsAutoScrolling(false)

    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current)
    }

    resumeTimerRef.current = window.setTimeout(() => {
      autoScrollEnabledRef.current = true
      setIsAutoScrolling(true)
      lastFrameTimeRef.current = null
    }, AUTO_SCROLL_RESUME_DELAY_MS)
  }

  useEffect(() => {
    if (!canReviewCode && isReviewOpen) {
      setIsReviewOpen(false)
    }
  }, [canReviewCode, isReviewOpen])

  useEffect(() => {
    if (!isReviewOpen) {
      autoScrollEnabledRef.current = false
      setIsAutoScrolling(false)
      return
    }

    autoScrollEnabledRef.current = true
    setIsAutoScrolling(true)

    const tick = (timestamp: number) => {
      const viewport = reviewViewportRef.current
      if (viewport && autoScrollEnabledRef.current) {
        const maxScrollTop = Math.max(
          viewport.scrollHeight - viewport.clientHeight,
          0,
        )

        if (viewport.scrollTop < maxScrollTop) {
          const deltaSeconds = lastFrameTimeRef.current
            ? (timestamp - lastFrameTimeRef.current) / 1000
            : 0
          const nextTop = Math.min(
            maxScrollTop,
            viewport.scrollTop + deltaSeconds * AUTO_SCROLL_SPEED_PX_PER_SECOND,
          )
          viewport.scrollTop = nextTop
        }
      }

      lastFrameTimeRef.current = timestamp
      autoScrollFrameRef.current = window.requestAnimationFrame(tick)
    }

    autoScrollFrameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (autoScrollFrameRef.current) {
        window.cancelAnimationFrame(autoScrollFrameRef.current)
        autoScrollFrameRef.current = null
      }

      if (resumeTimerRef.current) {
        window.clearTimeout(resumeTimerRef.current)
        resumeTimerRef.current = null
      }

      lastFrameTimeRef.current = null
      autoScrollEnabledRef.current = false
      setIsAutoScrolling(false)
    }
  }, [isReviewOpen, reviewCode])

  useEffect(() => {
    if (!isReviewOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isReviewOpen])

  useEffect(() => {
    if (!isReviewOpen) {
      setActiveReviewFunctionKey(null)
      setFunctionOverlayRects({})
      return
    }

    const viewport = reviewViewportRef.current
    const codeLineList = reviewCodeLineRef.current
    if (!viewport || !codeLineList) {
      return
    }

    const firstLineItem = codeLineList.querySelector('li')
    const lineHeight = firstLineItem
      ? parseFloat(window.getComputedStyle(firstLineItem).lineHeight)
      : 22
    const safeLineHeight = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 22

    const syncHighlight = () => {
      const focusLine = Math.floor((viewport.scrollTop + viewport.clientHeight * 0.35) / safeLineHeight) + 1
      const activeFn = reviewFunctions.find(
        (fn) => focusLine >= fn.startLine && focusLine <= fn.endLine,
      )
      if (!activeFn) {
        setActiveReviewFunctionKey(null)
        return
      }

      const functionKey = getFunctionKey(activeFn)
      const functionStartPx = (activeFn.startLine - 1) * safeLineHeight
      const functionEndPx = activeFn.endLine * safeLineHeight
      const focusPx = viewport.scrollTop + viewport.clientHeight * 0.35
      const rawProgress = (focusPx - functionStartPx) / Math.max(functionEndPx - functionStartPx, 1)
      const clampedProgress = Math.max(0, Math.min(1, rawProgress))

      setActiveReviewFunctionKey(functionKey)
      setFunctionReadoutProgress((previous) => ({
        ...previous,
        [functionKey]: Math.max(previous[functionKey] ?? 0, clampedProgress),
      }))
    }

    syncHighlight()
    viewport.addEventListener('scroll', syncHighlight, { passive: true })
    window.addEventListener('resize', syncHighlight)

    return () => {
      viewport.removeEventListener('scroll', syncHighlight)
      window.removeEventListener('resize', syncHighlight)
    }
  }, [isReviewOpen, reviewFunctions, reviewLines.length])

  useEffect(() => {
    if (!isReviewOpen) {
      setFunctionOverlayRects({})
      return
    }

    const lineList = reviewCodeLineRef.current
    if (!lineList) {
      return
    }
    const codePane = lineList.closest('.review-code-pane') as HTMLElement | null
    if (!codePane) {
      return
    }

    const getOffsetTopWithinPane = (element: HTMLElement, pane: HTMLElement) => {
      let totalTop = 0
      let current: HTMLElement | null = element

      while (current && current !== pane) {
        totalTop += current.offsetTop
        current = current.offsetParent as HTMLElement | null
      }

      return totalTop
    }

    const nextRects = reviewFunctions.reduce<Record<string, { top: number; height: number }>>(
      (accumulator, fn) => {
        const startIndex = Math.max(fn.startLine - 1, 0)
        const endIndex = Math.max(fn.endLine - 1, startIndex)
        const startEl = lineList.children.item(startIndex) as HTMLElement | null
        const endEl = lineList.children.item(endIndex) as HTMLElement | null
        if (!startEl || !endEl) {
          return accumulator
        }

        const top = getOffsetTopWithinPane(startEl, codePane)
        const endBottom = getOffsetTopWithinPane(endEl, codePane) + endEl.offsetHeight
        const height = Math.max(endBottom - top, startEl.offsetHeight)
        accumulator[getFunctionKey(fn)] = { top, height }
        return accumulator
      },
      {},
    )

    setFunctionOverlayRects(nextRects)
  }, [isReviewOpen, reviewFunctions, reviewLines.length])

  useEffect(() => {
    if (!isReviewOpen || !activeReviewFunctionKey || typeof window === 'undefined') {
      return
    }

    let frameId: number | null = null
    let lastTime: number | null = null

    const tick = (timestamp: number) => {
      const viewport = reviewViewportRef.current
      if (viewport) {
        const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0)
        const atBottom = viewport.scrollTop >= maxScrollTop - 1

        if (atBottom) {
          const deltaSeconds =
            lastTime === null ? 0 : Math.max((timestamp - lastTime) / 1000, 0)
          setFunctionReadoutProgress((previous) => {
            const current = previous[activeReviewFunctionKey] ?? 0
            if (current >= 1 || deltaSeconds <= 0) {
              return previous
            }

            const next = Math.min(1, current + deltaSeconds * READOUT_TAIL_PROGRESS_PER_SECOND)
            if (next === current) {
              return previous
            }

            return { ...previous, [activeReviewFunctionKey]: next }
          })
        }
      }

      lastTime = timestamp
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [activeReviewFunctionKey, isReviewOpen])

  useEffect(() => {
    if (!isReviewOpen || typeof window === 'undefined') {
      setScanlineExtent(null)
      return
    }

    let frameId: number | null = null
    let lastTime: number | null = null
    let tailOffsetPx = 0
    let maxReachedBottomPx = 0

    const getOffsetTopWithinPane = (element: HTMLElement, pane: HTMLElement) => {
      let totalTop = 0
      let current: HTMLElement | null = element

      while (current && current !== pane) {
        totalTop += current.offsetTop
        current = current.offsetParent as HTMLElement | null
      }

      return totalTop
    }

    const tick = (timestamp: number) => {
      const viewport = reviewViewportRef.current
      const lineList = reviewCodeLineRef.current
      const codePane = lineList?.closest('.review-code-pane') as HTMLElement | null

      if (!viewport || !lineList || !codePane) {
        frameId = window.requestAnimationFrame(tick)
        return
      }

      const firstLine = lineList.querySelector('li') as HTMLElement | null
      const lastLine = lineList.lastElementChild as HTMLElement | null
      if (!firstLine || !lastLine) {
        setScanlineExtent(null)
        frameId = window.requestAnimationFrame(tick)
        return
      }

      const firstTop = getOffsetTopWithinPane(firstLine, codePane)
      const lastBottom = getOffsetTopWithinPane(lastLine, codePane) + lastLine.offsetHeight
      const maxBottom = Math.max(lastBottom, firstTop)

      const maxScrollTop = Math.max(viewport.scrollHeight - viewport.clientHeight, 0)
      const atBottom = viewport.scrollTop >= maxScrollTop - 1
      const baseBottom = Math.max(firstTop, Math.min(maxBottom, firstTop + viewport.scrollTop))

      const deltaSeconds =
        lastTime === null ? 0 : Math.max((timestamp - lastTime) / 1000, 0)
      if (atBottom && deltaSeconds > 0) {
        tailOffsetPx = Math.min(
          Math.max(maxBottom - baseBottom, 0),
          tailOffsetPx + deltaSeconds * SCANLINE_TAIL_SPEED_PX_PER_SECOND,
        )
      } else {
        tailOffsetPx = 0
      }

      const nextBottom = Math.min(maxBottom, baseBottom + tailOffsetPx)
      const readoutCrossBottom = activeFunctionOverlay
        ? Math.min(
            maxBottom,
            activeFunctionOverlay.top + Math.max(Math.min(activeFunctionOverlay.height * 0.2, 20), 4),
          )
        : firstTop
      maxReachedBottomPx = Math.max(maxReachedBottomPx, nextBottom, readoutCrossBottom)
      const nextHeight = Math.max(3, maxReachedBottomPx - firstTop)

      setScanlineExtent((previous) => {
        if (
          previous &&
          Math.abs(previous.top - firstTop) < 0.2 &&
          Math.abs(previous.height - nextHeight) < 0.2
        ) {
          return previous
        }

        return { top: firstTop, height: nextHeight }
      })

      lastTime = timestamp
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [activeFunctionOverlay, isReviewOpen, reviewLines.length])

  useEffect(() => {
    if (!fileContextMenu) {
      return
    }

    const clearContextMenu = () => setFileContextMenu(null)
    const clearByEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFileContextMenu(null)
      }
    }

    window.addEventListener('click', clearContextMenu)
    window.addEventListener('resize', clearContextMenu)
    window.addEventListener('keydown', clearByEscape)

    return () => {
      window.removeEventListener('click', clearContextMenu)
      window.removeEventListener('resize', clearContextMenu)
      window.removeEventListener('keydown', clearByEscape)
    }
  }, [fileContextMenu])

  useEffect(() => {
    if (!workspaceId || !isSupabaseReady || !isAutoSaveEnabled) {
      return
    }

    if (revision === lastSyncedRevisionRef.current) {
      return
    }

    const timer = window.setTimeout(async () => {
      const response = await saveToSupabase(workspaceId)
      if (!response.ok) {
        setWorkspaceMessage(`Auto-save failed: ${response.error ?? 'Unknown error'}`)
        return
      }

      syncPagesFromSnapshot(exportSnapshot())
      lastSyncedRevisionRef.current = revision
      setWorkspaceMessage(`Auto-saved for ${workspaceId}.`)
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [isAutoSaveEnabled, isSupabaseReady, revision, saveToSupabase, workspaceId])

  useEffect(() => {
    const handleEditorPaste = () => {
      if (!workspaceId || isAutoSaveEnabled || isUnsavedModalOpen) {
        return
      }

      setIsUnsavedModalOpen(true)
    }

    window.addEventListener('runway:editor-paste', handleEditorPaste)
    return () => window.removeEventListener('runway:editor-paste', handleEditorPaste)
  }, [isAutoSaveEnabled, isUnsavedModalOpen, workspaceId])

  return (
    <>
      <TopBar
        isSidebarOpen={isSidebarOpen}
        canReviewCode={canReviewCode}
        currentPageNumber={currentPageNumber}
        hasReachedLimit={hasReachedLimit}
        openPages={openPages}
        currentOpenPageNumber={currentPageNumber}
        workspaceId={workspaceId}
        isSupabaseReady={isSupabaseReady}
        syncStatus={syncStatus}
        getPageFilename={getPageFilename}
        onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        onOpenReview={handleOpenReview}
        onOpenProcessor={handleProcessCode}
        onRequestAddPage={handleRequestAddPage}
        onSaveWorkspace={handleSaveWorkspace}
        onOpenFile={handleOpenFile}
        onCloseWindow={handleCloseWindow}
        onEditUser={() => {
          setAuthMode('login')
          setAuthUsername(workspaceId || workspaceInput || '')
          setAuthError('')
          setIsAuthModalOpen(true)
        }}
      />
      <FileSidebar
        isOpen={isSidebarOpen}
        activePages={activePages}
        hasReachedLimit={hasReachedLimit}
        onRequestAddPage={handleRequestAddPage}
        onOpenFile={handleOpenFile}
        onOpenContextMenu={({ pageNumber, x, y }) => {
          setFileContextMenu({ pageNumber, x, y })
        }}
        onClearContextMenu={() => setFileContextMenu(null)}
        getPageFilename={getPageFilename}
      />
      {fileContextMenu ? (
        <FileContextMenu
          x={fileContextMenu.x}
          y={fileContextMenu.y}
          onDeleteFile={() => {
            setDeleteConfirmPage(fileContextMenu.pageNumber)
            setFileContextMenu(null)
          }}
        />
      ) : null}
      <main
        className={
          pathname.startsWith('/page/')
            ? `view view-editor${isSidebarOpen ? ' is-shifted' : ''}`
            : `view${isSidebarOpen ? ' is-shifted' : ''}`
        }
      >
        {children}
      </main>
      <ReviewModal
        isOpen={isReviewOpen}
        isAutoScrolling={isAutoScrolling}
        reviewLines={reviewLines}
        activeReviewFunction={activeReviewFunction}
        activeReadoutProgress={activeReadoutProgress}
        scanlineExtent={scanlineExtent}
        overlays={reviewOverlays}
        reviewViewportRef={reviewViewportRef}
        reviewCodeLineRef={reviewCodeLineRef}
        onPauseInteraction={pauseAutoScrollForInteraction}
        onClose={() => setIsReviewOpen(false)}
      />
      <ProcessorModal
        isOpen={isProcessorModalOpen}
        message={processorMessage}
        lineCount={processedLineCount}
        functions={processedFunctions}
        onClose={() => setIsProcessorModalOpen(false)}
      />
      <NewPageModal
        isOpen={isNewPageModalOpen}
        language={newPageLanguage}
        onSetLanguage={setNewPageLanguage}
        onCreate={() => handleCreatePageWithLanguage(newPageLanguage)}
        onCancel={handleCancelNewPage}
      />
      <UnsavedModal
        isOpen={isUnsavedModalOpen}
        onSave={async () => {
          const ok = await handleSaveWorkspace()
          if (ok) {
            setIsUnsavedModalOpen(false)
          }
        }}
        onCancel={() => setIsUnsavedModalOpen(false)}
      />
      <DeleteFileModal
        isOpen={deleteConfirmPage !== null}
        filename={deleteConfirmPage !== null ? getPageFilename(deleteConfirmPage) : ''}
        onDelete={() => {
          if (deleteConfirmPage === null) {
            return
          }

          handleDeleteFile(deleteConfirmPage)
          setDeleteConfirmPage(null)
        }}
        onCancel={() => setDeleteConfirmPage(null)}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        workspaceId={workspaceId}
        authMode={authMode}
        authUsername={authUsername}
        authError={authError}
        isAuthBusy={isAuthBusy}
        isSupabaseReady={isSupabaseReady}
        onSetMode={(mode) => {
          setAuthMode(mode)
          setAuthError('')
        }}
        onSetUsername={setAuthUsername}
        onSubmit={authMode === 'login' ? handleLogin : handleCreateUser}
        onCancel={() => {
          setAuthError('')
          setIsAuthModalOpen(false)
        }}
      />
    </>
  )
}
