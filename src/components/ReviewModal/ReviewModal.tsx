import { type RefObject } from 'react'

import type {
  NamedFunctionMatch,
} from '../../lib/tsx-function-processor'

import './ReviewModal.css'

type OverlayItem = {
  key: string
  top: number
  height: number
  text: string
  isActive: boolean
}

type ReviewModalProps = {
  isOpen: boolean
  isAutoScrolling: boolean
  reviewLines: string[]
  reviewFunctions: NamedFunctionMatch[]
  activeReviewFunction: NamedFunctionMatch | null
  railExtent: { top: number; height: number; lineHeight: number } | null
  overlays: OverlayItem[]
  reviewViewportRef: RefObject<HTMLDivElement | null>
  reviewCodeLineRef: RefObject<HTMLOListElement | null>
  onPauseInteraction: () => void
  onClose: () => void
}

export function ReviewModal({
  isOpen,
  isAutoScrolling,
  reviewLines,
  reviewFunctions,
  activeReviewFunction,
  railExtent,
  overlays,
  reviewViewportRef,
  reviewCodeLineRef,
  onPauseInteraction,
  onClose,
}: ReviewModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <section className="review-modal" role="dialog" aria-modal="true" aria-label="Code review">
      <div className="review-header">
        <strong>Code Review Playback</strong>
        <span className="review-status">{isAutoScrolling ? 'Auto-scroll on' : 'Manual scroll detected'}</span>
        <button type="button" className="review-close-button" onClick={onClose}>
          Close
        </button>
      </div>
      <div
        className="review-viewport"
        ref={reviewViewportRef}
        tabIndex={0}
        onWheel={onPauseInteraction}
        onTouchStart={onPauseInteraction}
        onTouchMove={onPauseInteraction}
        onPointerDown={onPauseInteraction}
        onKeyDown={onPauseInteraction}
      >
        <div className="review-layout">
          <div className="review-code-pane">
            <div className="review-readout-overlay-layer">
              {overlays.map((overlay) => (
                <div
                  key={overlay.key}
                  className={overlay.isActive ? 'review-readout-overlay is-active' : 'review-readout-overlay is-complete'}
                  style={{
                    top: `${overlay.top}px`,
                    height: `${overlay.height}px`,
                  }}
                >
                  <div className="review-readout-card">
                    <p className="review-readout-text">{overlay.text || '\u00A0'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="review-rail-layer" aria-hidden="true">
              {railExtent ? (
                <>
                  <div
                    className="review-rail-base"
                    style={{ top: `${railExtent.top}px`, height: `${railExtent.height}px` }}
                  />
                  {reviewFunctions.map((fn) => {
                    const segmentTop = railExtent.top + (fn.startLine - 1) * railExtent.lineHeight
                    const segmentHeight = Math.max(
                      3,
                      (fn.endLine - fn.startLine + 1) * railExtent.lineHeight,
                    )

                    return (
                      <div
                        key={`${fn.name}-${fn.startLine}-${fn.endLine}-rail`}
                        className="review-rail-function"
                        style={{ top: `${segmentTop}px`, height: `${segmentHeight}px` }}
                      />
                    )
                  })}
                </>
              ) : null}
            </div>
            <div className="review-content">
              <ol className="review-line-numbers" aria-hidden="true">
                {reviewLines.map((_, index) => {
                  const lineNumber = index + 1
                  const isHighlighted =
                    activeReviewFunction &&
                    lineNumber >= activeReviewFunction.startLine &&
                    lineNumber <= activeReviewFunction.endLine

                  return (
                    <li key={index} className={isHighlighted ? 'is-function-highlight' : undefined}>
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
                    <li key={index} className={isHighlighted ? 'is-function-highlight' : undefined}>
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
