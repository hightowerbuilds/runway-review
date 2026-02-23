import { type RefObject } from 'react'

import type {
  NamedFunctionMatch,
} from '../../lib/tsx-function-processor'

import './ReviewModal.css'

type OverlayItem = {
  key: string
  functionKey: string
  functionName: string
  startLine: number
  endLine: number
  top: number
  height: number
  text: string
  isActive: boolean
  isCompleted: boolean
  isHoverReveal: boolean
  stateItems?: string[]
  hookItems?: string[]
  dataTypeItems?: string[]
}

type ReviewModalProps = {
  isOpen: boolean
  isAutoScrolling: boolean
  isAutoScrollEnabled: boolean
  reviewLines: string[]
  reviewFunctions: NamedFunctionMatch[]
  activeReviewFunction: NamedFunctionMatch | null
  railExtent: { top: number; height: number; lineHeight: number } | null
  overlays: OverlayItem[]
  reviewViewportRef: RefObject<HTMLDivElement | null>
  reviewCodeLineRef: RefObject<HTMLOListElement | null>
  onHoverFunction: (functionKey: string | null) => void
  onToggleAutoScroll: () => void
  onClose: () => void
}

function getFunctionKey(fn: NamedFunctionMatch) {
  return `${fn.name}-${fn.startLine}-${fn.endLine}`
}

export function ReviewModal({
  isOpen,
  isAutoScrolling,
  isAutoScrollEnabled,
  reviewLines,
  reviewFunctions,
  activeReviewFunction,
  railExtent,
  overlays,
  reviewViewportRef,
  reviewCodeLineRef,
  onHoverFunction,
  onToggleAutoScroll,
  onClose,
}: ReviewModalProps) {
  if (!isOpen) {
    return null
  }

  const findFunctionKeyAtLine = (lineNumber: number) => {
    const matches = reviewFunctions.filter(
      (fn) => lineNumber >= fn.startLine && lineNumber <= fn.endLine,
    )

    if (matches.length === 0) {
      return null
    }

    const targetFn = matches.reduce((best, current) => {
      const bestSpan = best.endLine - best.startLine
      const currentSpan = current.endLine - current.startLine
      return currentSpan < bestSpan ? current : best
    })

    return getFunctionKey(targetFn)
  }

  return (
    <section className="review-modal" role="dialog" aria-modal="true" aria-label="Code review">
      <div className="review-header">
        <div className="review-header-left">
          <button type="button" className="review-back-button" onClick={onClose}>
            {'<< Back'}
          </button>
          <button
            type="button"
            className={isAutoScrollEnabled ? 'review-toggle-button is-on' : 'review-toggle-button'}
            onClick={onToggleAutoScroll}
          >
            {isAutoScrollEnabled ? 'Still' : 'Scroll'}
          </button>
          <span className="review-status">{isAutoScrolling ? 'Scrolling...' : 'Being still.'}</span>
        </div>
      </div>
      <div className="review-viewport" ref={reviewViewportRef} tabIndex={0}>
        <div className="review-layout">
          <div className="review-code-pane">
            <div className="review-readout-overlay-layer">
              {overlays.map((overlay) => (
                <div
                  key={overlay.key}
                  className={[
                    'review-readout-overlay',
                    overlay.isActive ? 'is-active' : 'is-complete',
                    overlay.isHoverReveal ? 'is-hover-reveal' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    top: `${overlay.top}px`,
                    height: `${overlay.height}px`,
                  }}
                >
                  <div className="review-readout-card">
                    <div className="review-readout-state-layer">
                      <div className="review-readout-meta-stack">
                        <div className="review-readout-meta-block">
                          <span className="review-readout-meta-label">State</span>
                          <span className="review-readout-state-text">
                            {(overlay.stateItems ?? ['stateless']).join('\n')}
                          </span>
                        </div>
                        <div className="review-readout-meta-block">
                          <span className="review-readout-meta-label">Hooks</span>
                          <span className="review-readout-state-text">
                            {(overlay.hookItems ?? ['hookless']).join('\n')}
                          </span>
                        </div>
                        <div className="review-readout-meta-block">
                          <span className="review-readout-meta-label">Data Types</span>
                          <span className="review-readout-state-text">
                            {(overlay.dataTypeItems ?? ['typeless']).join('\n')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="review-readout-text">{overlay.text || '\u00A0'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div
              className="review-content"
              onMouseLeave={() => {
                onHoverFunction(null)
              }}
            >
              <ol className="review-line-numbers" aria-hidden="true">
                {reviewLines.map((_, index) => {
                  const lineNumber = index + 1
                  const isHighlighted =
                    activeReviewFunction &&
                    lineNumber >= activeReviewFunction.startLine &&
                    lineNumber <= activeReviewFunction.endLine

                  return (
                    <li
                      key={index}
                      className={isHighlighted ? 'is-function-highlight' : undefined}
                      onMouseEnter={() => {
                        if (!isAutoScrollEnabled) {
                          onHoverFunction(findFunctionKeyAtLine(lineNumber))
                        }
                      }}
                    >
                      {lineNumber}
                    </li>
                  )
                })}
              </ol>
              <ol className="review-code-lines" ref={reviewCodeLineRef}>
                {reviewLines.map((line, index) => {
                  const lineNumber = index + 1
                  const isHighlighted =
                    activeReviewFunction &&
                    lineNumber >= activeReviewFunction.startLine &&
                    lineNumber <= activeReviewFunction.endLine

                  return (
                    <li
                      key={index}
                      className={isHighlighted ? 'is-function-highlight' : undefined}
                      onMouseEnter={() => {
                        if (!isAutoScrollEnabled) {
                          onHoverFunction(findFunctionKeyAtLine(lineNumber))
                        }
                      }}
                    >
                      {line.length > 0 ? line : '\u00A0'}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
