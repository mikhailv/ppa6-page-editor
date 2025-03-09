import { Rect } from './rect';

export function sortBy<T, R>(values: T[], mapper: (v: T) => R): void {
  values.sort((a, b) => {
    const v1 = mapper(a)
    const v2 = mapper(b)
    if (v1 == v2) {
      return 0
    }
    return v1 < v2 ? -1 : 1
  })
}

export function sortRectsByPosition(rects: Rect[]): void {
  rects.sort((a, b) => {
    if (a.y === b.y) {
      return a.x - b.x
    }
    return a.y - b.y
  })
}

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>): void {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(context, args), wait)
  } as T
}

export function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v))
}
