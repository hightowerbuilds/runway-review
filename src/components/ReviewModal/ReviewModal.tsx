import { type RefObject } from 'react'

import type { NamedFunctionMatch } from '../../lib/tsx-function-processor'

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
  activeReviewFunction: NamedFunctionMatch | null
  activeReadoutProgress: number
  scanlineExtent: { top: number; height: number } | null
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
  activeReviewFunction,
  activeReadoutProgress,
  scanlineExtent,
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
            <div className="review-scanline-layer" aria-hidden="true">
              {scanlineExtent ? (
                <div
                  className="review-scanline"
                  style={{ top: `${scanlineExtent.top}px`, height: `${scanlineExtent.height}px` }}
                />
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
          <aside className="review-side-info">
            <h3>Function Context</h3>
            {activeReviewFunction ? (
              <>
                <p>
                  <strong>{activeReviewFunction.name}</strong>
                </p>
                <p>
                  Lines {activeReviewFunction.startLine}
                  {activeReviewFunction.endLine !== activeReviewFunction.startLine
                    ? `-${activeReviewFunction.endLine}`
                    : ''}
                </p>
                <p>Progress: {Math.round(activeReadoutProgress * 100)}%</p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
              </>
            ) : (
              <p>Scroll through code to activate function readout.</p>
            )}
          </aside>
        </div>
      </div>
    </section>
  )
}
