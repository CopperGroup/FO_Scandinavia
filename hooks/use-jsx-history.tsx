"use client"

import { useState, useCallback, useEffect } from "react"
import type { ParsedElement } from "@/types/editor"

export function useJsxHistory(parsedContent: ParsedElement | null, setParsedContent: (content: ParsedElement) => void) {
  const [history, setHistory] = useState<ParsedElement[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Initialize history with initial content
  useEffect(() => {
    if (parsedContent && historyIndex === -1) {
      setHistory([JSON.parse(JSON.stringify(parsedContent))])
      setHistoryIndex(0)
    }
  }, [parsedContent, historyIndex])

  // Save current state to history
  const saveToHistory = useCallback(
    (newContent: ParsedElement) => {
      // Don't create a deep copy of the entire tree, just use the reference
      // since we're already creating new objects for changed parts

      // Truncate future history if we're not at the end
      const newHistory = history.slice(0, historyIndex + 1)

      // Add new state to history
      newHistory.push(newContent)

      // Update history state
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    },
    [history, historyIndex],
  )

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setParsedContent(history[newIndex])
      setHistoryIndex(newIndex)
    }
  }, [history, historyIndex, setParsedContent])

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setParsedContent(history[newIndex])
      setHistoryIndex(newIndex)
    }
  }, [history, historyIndex, setParsedContent])

  return {
    saveToHistory,
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  }
}

