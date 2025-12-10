import type React from "react"

export type DragSelectionRect = {
  left: number
  right: number
  top: number
  bottom: number
}

export type OverlayRect = {
  left: number
  top: number
  width: number
  height: number
}

type SpanSelection = {
  node: HTMLSpanElement
  startOffset: number
  endOffset: number
}

type DocumentWithCaretPosition = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null
}

export function beginPointerTracking(
  moveListenerRef: React.RefObject<((event: PointerEvent) => void) | undefined>,
  upListenerRef: React.RefObject<((event: PointerEvent) => void) | undefined>,
  dragStateRef: React.RefObject<{
    origin: { x: number; y: number }
    containerRect: DOMRect
    isActive: boolean
  } | null>,
  pageContentRef: React.RefObject<HTMLDivElement | null>,
  setDragOverlay: React.Dispatch<React.SetStateAction<OverlayRect | null>>
) {
  const handlePointerMove = (event: PointerEvent) => {
    const dragState = dragStateRef.current
    if (!dragState) return

    const distance = Math.hypot(
      event.clientX - dragState.origin.x,
      event.clientY - dragState.origin.y
    )
    if (!dragState.isActive && distance < 3) return

    if (!dragState.isActive) {
      dragState.isActive = true
    }

    const overlay = calculateOverlayRect(
      dragState.origin,
      { x: event.clientX, y: event.clientY },
      dragState.containerRect
    )
    setDragOverlay(overlay)
    event.preventDefault()
  }

  const handlePointerEnd = (event: PointerEvent) => {
    const dragState = dragStateRef.current
    detachPointerListeners(moveListenerRef, upListenerRef)
    dragStateRef.current = null

    if (dragState?.isActive && pageContentRef.current) {
      const selection = window.getSelection()
      selection?.removeAllRanges()

      const didSelectWithCaret = selectTextBetweenPoints(
        pageContentRef.current,
        dragState.origin,
        { x: event.clientX, y: event.clientY }
      )
      if (didSelectWithCaret) {
        event.preventDefault()
        setDragOverlay(null)
        return
      }

      const selectionRect = normalizeClientRect(dragState.origin, {
        x: event.clientX,
        y: event.clientY,
      })
      selectOverlappingText(pageContentRef.current, selectionRect)
      event.preventDefault()
    }

    setDragOverlay(null)
  }

  moveListenerRef.current = handlePointerMove
  upListenerRef.current = handlePointerEnd
  window.addEventListener("pointermove", handlePointerMove)
  window.addEventListener("pointerup", handlePointerEnd)
  window.addEventListener("pointercancel", handlePointerEnd)
}

export function detachPointerListeners(
  moveListenerRef: React.RefObject<((event: PointerEvent) => void) | undefined>,
  upListenerRef: React.RefObject<((event: PointerEvent) => void) | undefined>
) {
  if (moveListenerRef.current) {
    window.removeEventListener("pointermove", moveListenerRef.current)
  }
  if (upListenerRef.current) {
    window.removeEventListener("pointerup", upListenerRef.current)
    window.removeEventListener("pointercancel", upListenerRef.current)
  }

  moveListenerRef.current = undefined
  upListenerRef.current = undefined
}

function normalizeClientRect(
  firstPoint: { x: number; y: number },
  secondPoint: { x: number; y: number }
): DragSelectionRect {
  return {
    left: Math.min(firstPoint.x, secondPoint.x),
    right: Math.max(firstPoint.x, secondPoint.x),
    top: Math.min(firstPoint.y, secondPoint.y),
    bottom: Math.max(firstPoint.y, secondPoint.y),
  }
}

function calculateOverlayRect(
  origin: { x: number; y: number },
  current: { x: number; y: number },
  containerRect: DOMRect
): OverlayRect {
  const left = Math.min(origin.x, current.x) - containerRect.left
  const top = Math.min(origin.y, current.y) - containerRect.top
  const width = Math.abs(current.x - origin.x)
  const height = Math.abs(current.y - origin.y)

  return { left, top, width, height }
}

function selectOverlappingText(
  container: HTMLDivElement,
  selectionRect: DragSelectionRect
) {
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()

  const textLayer = container.querySelector<HTMLDivElement>(
    ".react-pdf__Page__textContent"
  )
  if (!textLayer) return

  const spanSelections = Array.from(
    textLayer.querySelectorAll<HTMLSpanElement>("span")
  )
    .map(span => calculateSpanSelection(span, selectionRect))
    .filter(Boolean) as SpanSelection[]

  if (!selection || !spanSelections.length) return

  const first = spanSelections.at(0)
  const last = spanSelections.at(-1)
  if (!first || !last) return
  const firstTextNode = first.node.firstChild
  const lastTextNode = last.node.firstChild

  if (!firstTextNode || !lastTextNode) return

  const range = document.createRange()
  range.setStart(firstTextNode, first.startOffset)
  range.setEnd(lastTextNode, last.endOffset)
  selection.addRange(range)
}

function selectTextBetweenPoints(
  container: HTMLDivElement,
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number }
): boolean {
  const selection = window.getSelection()
  if (!selection) return false

  const startRange = createCaretRangeFromPoint(startPoint)
  const endRange = createCaretRangeFromPoint(endPoint)

  if (!startRange || !endRange) return false
  if (
    !container.contains(startRange.startContainer) ||
    !container.contains(endRange.startContainer)
  ) {
    return false
  }

  const normalizedRange = document.createRange()
  const isStartBeforeEnd =
    startRange.compareBoundaryPoints(Range.START_TO_START, endRange) <= 0

  const anchor = isStartBeforeEnd ? startRange : endRange
  const focus = isStartBeforeEnd ? endRange : startRange

  normalizedRange.setStart(anchor.startContainer, anchor.startOffset)
  normalizedRange.setEnd(focus.startContainer, focus.startOffset)

  selection.addRange(normalizedRange)
  return true
}

function createCaretRangeFromPoint(point: { x: number; y: number }) {
  const doc = document as DocumentWithCaretPosition

  if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(point.x, point.y)
    if (position) {
      const range = document.createRange()
      range.setStart(position.offsetNode, position.offset)
      range.collapse(true)
      return range
    }
  }

  if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(point.x, point.y)
    if (range) {
      const collapsed = range.cloneRange()
      collapsed.collapse(true)
      return collapsed
    }
  }

  return null
}

function calculateSpanSelection(
  span: HTMLSpanElement,
  selectionRect: DragSelectionRect
): SpanSelection | null {
  const rect = span.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  if (!isOverlap(selectionRect, rect)) return null

  const textContent = span.textContent ?? ""
  if (!textContent.length) return null

  const startBoundary = Math.max(rect.left, selectionRect.left)
  const endBoundary = Math.min(rect.right, selectionRect.right)
  const normalizedStart =
    rect.width > 0 ? (startBoundary - rect.left) / rect.width : 0
  const normalizedEnd =
    rect.width > 0 ? (endBoundary - rect.left) / rect.width : 1

  const startOffset = clamp(
    Math.floor(textContent.length * Math.min(normalizedStart, normalizedEnd)),
    0,
    textContent.length
  )
  const rawEndOffset = clamp(
    Math.ceil(textContent.length * Math.max(normalizedStart, normalizedEnd)),
    0,
    textContent.length
  )

  return {
    node: span,
    startOffset,
    endOffset:
      startOffset === rawEndOffset && textContent.length > 0
        ? Math.min(textContent.length, startOffset + 1)
        : rawEndOffset,
  }
}

function isOverlap(
  selectionRect: DragSelectionRect,
  elementRect: DOMRect
): boolean {
  return !(
    elementRect.right < selectionRect.left ||
    elementRect.left > selectionRect.right ||
    elementRect.bottom < selectionRect.top ||
    elementRect.top > selectionRect.bottom
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
