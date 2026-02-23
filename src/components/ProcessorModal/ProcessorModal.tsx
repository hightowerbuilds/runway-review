import type {
  DataTypeMatch,
  HookCallMatch,
  NamedFunctionMatch,
  StateDeclarationMatch,
} from '../../lib/tsx-function-processor'
import { useEffect, useMemo, useRef, useState } from 'react'

import '../ModalBase/ModalBase.css'
import './ProcessorModal.css'

type ProcessorModalProps = {
  isOpen: boolean
  message: string
  lineCount: number
  functions: NamedFunctionMatch[]
  stateDeclarations: StateDeclarationMatch[]
  hooks?: HookCallMatch[]
  dataTypes?: DataTypeMatch[]
  sourceCode?: string
  onClose: () => void
}

export function ProcessorModal({
  isOpen,
  message,
  lineCount,
  functions,
  stateDeclarations,
  hooks = [],
  dataTypes = [],
  sourceCode = '',
  onClose,
}: ProcessorModalProps) {
  const [expandedStateByFunction, setExpandedStateByFunction] = useState<
    Record<string, boolean>
  >({})
  const [expandedStateByHook, setExpandedStateByHook] = useState<Record<string, boolean>>({})
  const [selectedFunctionKey, setSelectedFunctionKey] = useState<string | null>(null)
  const [hasCopiedFunctionCode, setHasCopiedFunctionCode] = useState(false)
  const selectedFunctionCodeRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedFunctionKey(null)
      setHasCopiedFunctionCode(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedFunctionKey) {
      return
    }

    setHasCopiedFunctionCode(false)
    selectedFunctionCodeRef.current?.focus()
  }, [selectedFunctionKey])

  const dataTypesOutsideFunctions = useMemo(() => {
    return dataTypes.filter(
      (item) =>
        !functions.some((fn) => item.line >= fn.startLine && item.line <= fn.endLine),
    )
  }, [dataTypes, functions])

  const functionStateGroups = useMemo(() => {
    const groups = functions.map((fn) => ({
      fn,
      stateNames: [] as string[],
      hooks: [] as HookCallMatch[],
      dataTypes: [] as DataTypeMatch[],
    }))

    stateDeclarations.forEach((stateItem) => {
      const candidates = groups.filter(
        ({ fn }) => stateItem.line >= fn.startLine && stateItem.line <= fn.endLine,
      )
      if (candidates.length === 0) {
        return
      }

      const bestMatch = candidates.reduce((best, current) => {
        const bestSpan = best.fn.endLine - best.fn.startLine
        const currentSpan = current.fn.endLine - current.fn.startLine
        return currentSpan < bestSpan ? current : best
      })

      if (!bestMatch.stateNames.includes(stateItem.name)) {
        bestMatch.stateNames.push(stateItem.name)
      }
    })

    hooks.forEach((hookItem) => {
      const candidates = groups.filter(
        ({ fn }) => hookItem.line >= fn.startLine && hookItem.line <= fn.endLine,
      )
      if (candidates.length === 0) {
        return
      }

      const bestMatch = candidates.reduce((best, current) => {
        const bestSpan = best.fn.endLine - best.fn.startLine
        const currentSpan = current.fn.endLine - current.fn.startLine
        return currentSpan < bestSpan ? current : best
      })

      if (!bestMatch.hooks.some((existing) => existing.name === hookItem.name)) {
        bestMatch.hooks.push(hookItem)
      }
    })

    dataTypes.forEach((item) => {
      const candidates = groups.filter(
        ({ fn }) => item.line >= fn.startLine && item.line <= fn.endLine,
      )
      if (candidates.length === 0) {
        return
      }

      const bestMatch = candidates.reduce((best, current) => {
        const bestSpan = best.fn.endLine - best.fn.startLine
        const currentSpan = current.fn.endLine - current.fn.startLine
        return currentSpan < bestSpan ? current : best
      })

      if (
        !bestMatch.dataTypes.some(
          (existing) => existing.typeName === item.typeName && existing.line === item.line,
        )
      ) {
        bestMatch.dataTypes.push(item)
      }
    })

    groups.forEach((group) => {
      group.dataTypes.sort((a, b) => a.line - b.line || a.typeName.localeCompare(b.typeName))
    })

    return groups
  }, [dataTypes, functions, hooks, stateDeclarations])

  const selectedFunctionPreview = useMemo(() => {
    if (!selectedFunctionKey) {
      return null
    }

    const selectedFunction = functions.find(
      (fn) => `${fn.name}-${fn.startLine}-${fn.endLine}` === selectedFunctionKey,
    )
    if (!selectedFunction) {
      return null
    }

    const normalizedCode = sourceCode.replace(/\r\n?/g, '\n')
    const sourceLines = normalizedCode.split('\n')
    const sliceStart = Math.max(selectedFunction.startLine - 1, 0)
    const sliceEnd = Math.max(selectedFunction.endLine, sliceStart)
    const functionLines = sourceLines.slice(sliceStart, sliceEnd)
    const formattedFunctionCode = functionLines.join('\n')

    return {
      name: selectedFunction.name,
      startLine: selectedFunction.startLine,
      endLine: selectedFunction.endLine,
      code: formattedFunctionCode,
    }
  }, [functions, selectedFunctionKey, sourceCode])

  if (!isOpen) {
    return null
  }

  async function handleCopyFunctionCode() {
    if (!selectedFunctionPreview?.code) {
      return
    }

    try {
      await navigator.clipboard.writeText(selectedFunctionPreview.code)
      setHasCopiedFunctionCode(true)
    } catch {
      selectedFunctionCodeRef.current?.focus()
      selectedFunctionCodeRef.current?.select()
      const copied = document.execCommand('copy')
      setHasCopiedFunctionCode(copied)
    }
  }

  return (
    <section className="processor-modal" role="dialog" aria-modal="true" aria-label="Code processor">
      <div className="processor-header">
        <button type="button" className="processor-back-button" onClick={onClose}>
          {'<< back'}
        </button>
        <h2 className="processor-title">Thumbnails</h2>
      </div>
      <div className="processor-content">
        <p>{message}</p>
        <p className="processor-line-count">
          Total lines: <strong>{lineCount}</strong>
        </p>
        {functionStateGroups.length > 0 ? (
          <div className="processor-groups">
            {functionStateGroups.map(({ fn, stateNames, hooks: functionHooks, dataTypes: functionDataTypes }) => {
              const functionKey = `${fn.name}-${fn.startLine}-${fn.endLine}`
              const isStateExpanded = expandedStateByFunction[functionKey] ?? false

              return (
                <section
                  key={functionKey}
                  className="processor-group-card"
                  onDoubleClick={() => setSelectedFunctionKey(functionKey)}
                  title="Double-click thumbnail to preview function code"
                >
                  <div
                    className="processor-item processor-function-row"
                    onDoubleClick={() => setSelectedFunctionKey(functionKey)}
                    title="Double-click to preview function code"
                  >
                    <button
                      type="button"
                      className="processor-function-name-button"
                      onDoubleClick={() => setSelectedFunctionKey(functionKey)}
                    >
                      {fn.name}
                    </button>
                    <button
                      type="button"
                      className="processor-function-open-button"
                      onClick={() => setSelectedFunctionKey(functionKey)}
                    >
                      Open
                    </button>
                    <span className="processor-line">
                      lines {fn.startLine}
                      {fn.endLine !== fn.startLine ? `-${fn.endLine}` : ''}
                    </span>
                  </div>
                  <div className="processor-subheading-row">
                    <p className="processor-subheading">State In Function</p>
                    {stateNames.length > 0 ? (
                      <button
                        type="button"
                        className="processor-state-toggle"
                        onClick={() =>
                          setExpandedStateByFunction((previous) => ({
                            ...previous,
                            [functionKey]: !isStateExpanded,
                          }))
                        }
                      >
                        {isStateExpanded ? 'Close' : 'Open'}
                      </button>
                    ) : null}
                  </div>
                  {stateNames.length > 0 && isStateExpanded ? (
                    <div className="processor-state-names">
                      {stateNames.map((stateName) => (
                        <span key={`${fn.name}-${stateName}`} className="processor-state-pill">
                          {stateName}
                        </span>
                      ))}
                    </div>
                  ) : stateNames.length > 0 ? (
                    <p className="processor-empty">State names hidden.</p>
                  ) : (
                    <p className="processor-empty">No state declarations in this function.</p>
                  )}
                  <p className="processor-subheading">Hooks In Function</p>
                  {functionHooks.length > 0 ? (
                    <div className="processor-hooks">
                      {functionHooks.map((hookItem) =>
                        hookItem.name === 'useState' ? (
                          <div key={`${fn.name}-${hookItem.name}-${hookItem.line}`} className="processor-hook-tab">
                            <div className="processor-hook-summary processor-hook-summary-row">
                              <span>{hookItem.name} (line {hookItem.line})</span>
                              {stateNames.length > 0 ? (
                                <button
                                  type="button"
                                  className="processor-state-toggle"
                                  onClick={() => {
                                    const hookStateKey = `${functionKey}-${hookItem.name}-${hookItem.line}`
                                    setExpandedStateByHook((previous) => ({
                                      ...previous,
                                      [hookStateKey]: !(previous[hookStateKey] ?? false),
                                    }))
                                  }}
                                >
                                  {(expandedStateByHook[
                                    `${functionKey}-${hookItem.name}-${hookItem.line}`
                                  ] ?? false)
                                    ? 'Close'
                                    : 'Open'}
                                </button>
                              ) : null}
                            </div>
                            <div className="processor-hook-panel is-open">
                              {stateNames.length > 0 &&
                              (expandedStateByHook[
                                `${functionKey}-${hookItem.name}-${hookItem.line}`
                              ] ?? false) ? (
                                <div className="processor-state-names">
                                  {stateNames.map((stateName) => (
                                    <span
                                      key={`${fn.name}-${hookItem.line}-${stateName}`}
                                      className="processor-state-pill"
                                    >
                                      {stateName}
                                    </span>
                                  ))}
                                </div>
                              ) : stateNames.length > 0 ? (
                                <p className="processor-empty">State names hidden. Use Open.</p>
                              ) : (
                                <p className="processor-empty">
                                  No state names declared in this function.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            key={`${fn.name}-${hookItem.name}-${hookItem.line}`}
                            className="processor-item processor-hook-row"
                          >
                            <span className="processor-name">{hookItem.name}</span>
                            <span className="processor-line">line {hookItem.line}</span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="processor-empty">No hooks detected in this function.</p>
                  )}
                  <p className="processor-subheading">Data Types In Function</p>
                  {functionDataTypes.length > 0 ? (
                    <ol className="processor-list">
                      {(() => {
                        const grouped = functionDataTypes.reduce<Map<number, string[]>>((acc, item) => {
                          const existing = acc.get(item.line) ?? []
                          if (!existing.includes(item.typeName)) {
                            existing.push(item.typeName)
                          }
                          acc.set(item.line, existing)
                          return acc
                        }, new Map<number, string[]>())

                        return [...grouped.entries()]
                          .sort((a, b) => a[0] - b[0])
                          .map(([line, typeNames]) =>
                            typeNames.length > 1 ? (
                              <li key={`${fn.name}-types-line-${line}`} className="processor-item">
                                <details className="processor-line-toggle">
                                  <summary className="processor-line-summary">
                                    <span className="processor-name">line {line}</span>
                                    <span className="processor-line">
                                      {typeNames.length} types
                                    </span>
                                  </summary>
                                  <div className="processor-line-panel">
                                    <div className="processor-state-names">
                                      {typeNames.map((typeName) => (
                                        <span
                                          key={`${fn.name}-line-${line}-${typeName}`}
                                          className="processor-state-pill"
                                        >
                                          {typeName}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </details>
                              </li>
                            ) : (
                              <li key={`${fn.name}-type-${line}`} className="processor-item">
                                <span className="processor-name">{typeNames[0]}</span>
                                <span className="processor-line">line {line}</span>
                              </li>
                            ),
                          )
                      })()}
                    </ol>
                  ) : (
                    <p className="processor-empty">No data types detected in this function.</p>
                  )}
                </section>
              )
            })}
            {dataTypesOutsideFunctions.length > 0 ? (
              <section className="processor-group-card processor-group-card-outside">
                <div className="processor-item">
                  <span className="processor-name">Full-File Scope</span>
                  <span className="processor-line">data types</span>
                </div>
                <p className="processor-subheading">Types Exterior to Named Functions</p>
                <ol className="processor-list">
                  {(() => {
                    const grouped = dataTypesOutsideFunctions.reduce<Map<number, string[]>>(
                      (acc, item) => {
                        const existing = acc.get(item.line) ?? []
                        if (!existing.includes(item.typeName)) {
                          existing.push(item.typeName)
                        }
                        acc.set(item.line, existing)
                        return acc
                      },
                      new Map<number, string[]>(),
                    )

                    return [...grouped.entries()]
                      .sort((a, b) => a[0] - b[0])
                      .map(([line, typeNames]) =>
                        typeNames.length > 1 ? (
                          <li key={`outside-line-${line}`} className="processor-item">
                            <details className="processor-line-toggle">
                              <summary className="processor-line-summary">
                                <span className="processor-name">line {line}</span>
                                <span className="processor-line">{typeNames.length} types</span>
                              </summary>
                              <div className="processor-line-panel">
                                <div className="processor-state-names">
                                  {typeNames.map((typeName) => (
                                    <span
                                      key={`outside-line-${line}-${typeName}`}
                                      className="processor-state-pill"
                                    >
                                      {typeName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </details>
                          </li>
                        ) : (
                          <li key={`outside-${line}`} className="processor-item">
                            <span className="processor-name">{typeNames[0]}</span>
                            <span className="processor-line">line {line}</span>
                          </li>
                        ),
                      )
                  })()}
                </ol>
              </section>
            ) : null}
          </div>
        ) : (
          <p className="processor-empty">No named functions were found in this file.</p>
        )}
      </div>
      {selectedFunctionPreview ? (
        <section
          className="processor-function-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Function preview"
          onKeyDownCapture={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
              event.preventDefault()
              selectedFunctionCodeRef.current?.focus()
              selectedFunctionCodeRef.current?.select()
            }
          }}
        >
          <div className="processor-function-modal-header">
            <button
              type="button"
              className="processor-back-button"
              onClick={() => setSelectedFunctionKey(null)}
            >
              {'<< back'}
            </button>
            <button
              type="button"
              className="processor-copy-button"
              onClick={() => {
                void handleCopyFunctionCode()
              }}
            >
              {hasCopiedFunctionCode ? 'Copied' : 'Copy to clipboard'}
            </button>
            <p className="processor-function-modal-title">
              {selectedFunctionPreview.name} ({selectedFunctionPreview.startLine}-{selectedFunctionPreview.endLine})
            </p>
          </div>
          <div className="processor-function-modal-content">
            {selectedFunctionPreview.code ? (
              <textarea
                ref={selectedFunctionCodeRef}
                className="processor-function-code"
                readOnly
                spellCheck={false}
                value={selectedFunctionPreview.code}
                aria-label={`Source for ${selectedFunctionPreview.name}`}
              />
            ) : (
              <p className="processor-empty">No source code available for this function.</p>
            )}
          </div>
        </section>
      ) : null}
    </section>
  )
}
