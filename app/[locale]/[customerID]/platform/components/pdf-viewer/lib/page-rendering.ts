export type PageRange = {
  start: number
  end: number
}

export const normalizeInitialPages = (
  pages: number[],
  pageCount: number | null
) => {
  if (!pageCount) return []
  const pageSet = new Set<number>()
  pages.forEach(page => {
    if (page >= 1 && page <= pageCount) {
      pageSet.add(page)
    }
  })
  return Array.from(pageSet).sort((a, b) => a - b)
}

export const isRangeCovered = (ranges: PageRange[], nextRange: PageRange) => {
  for (const range of ranges) {
    if (nextRange.start < range.start) return false
    if (range.start <= nextRange.start && range.end >= nextRange.end) {
      return true
    }
  }
  return false
}

export const mergeRanges = (ranges: PageRange[], nextRange: PageRange) => {
  const ordered = [...ranges, nextRange].sort((a, b) => a.start - b.start)
  const merged: PageRange[] = []

  ordered.forEach(range => {
    const lastRange = merged[merged.length - 1]
    if (!lastRange || range.start > lastRange.end + 1) {
      merged.push({ ...range })
      return
    }
    lastRange.end = Math.max(lastRange.end, range.end)
  })

  return merged
}

export const isPageInRanges = (pageNumber: number, ranges: PageRange[]) => {
  for (const range of ranges) {
    if (pageNumber < range.start) return false
    if (pageNumber <= range.end) return true
  }
  return false
}
