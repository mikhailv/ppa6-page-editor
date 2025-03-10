import { Pos, Rect } from './rect'
import { TextBlock } from './text-block'
import { Debug } from './debug'
import { sortBy, sortRectsByPosition } from './util'

const { min, max } = Math

export interface BlockLayout {
  name: string;
  apply: (blocks: TextBlock[], maxWidth: number, debug: Debug) => void
}

export const blockLayouts: BlockLayout[] = [
  { name: 'vertical', apply: verticalBlockLayout },
  { name: 'compact', apply: compactBlockLayout },
]

export function verticalBlockLayout(blocks: TextBlock[]): void {
  let y = 0
  for (const { rect } of blocks) {
    rect.x = 0
    rect.y = y
    y += rect.height
  }
}

export function compactBlockLayout(blocks: TextBlock[], maxWidth: number, debug: Debug): void {
  let y = 0
  const freeRects: Rect[] = [new Rect(0, 0, maxWidth, 10_000)]
  const allocRects: Rect[] = []
  sortBy(blocks, x => -x.rect.width * x.rect.height)
  for (const { rect } of blocks) {
    let pos: Pos
    for (const free of freeRects) {
      if (free.width >= rect.width) {
        const newRect = new Rect(free.x, free.y, rect.width, rect.height)
        if (!allocRects.some(r => r.overlaps(newRect))) {
          pos = free.pos
          break
        }
      }
    }
    rect.x = pos?.x ?? 0
    rect.y = pos?.y ?? y
    splitRectangles(freeRects, rect)
    sortRectsByPosition(freeRects)
    y = max(y, rect.y2 + 1)
    allocRects.push(rect)
  }
  debug.rects.push(...freeRects)
}

function splitRect(rect: Rect, by: Rect): Rect[] {
  if (!rect.overlaps(by)) {
    return [rect]
  }

  const cx1 = max(rect.x, by.x)
  const cx2 = min(rect.x2, by.x2)
  const cy1 = max(rect.y, by.y)
  const cy2 = min(rect.y2, by.y2)

  const cutLeft = cx1 > rect.x
  const cutRight = cx2 < rect.x2
  const cutTop = cy1 > rect.y
  const cutBottom = cy2 < rect.y2

  const r: Rect[] = []
  let fromY = rect.y
  let toY = rect.y2
  if (cutTop) {
    r.push(new Rect(rect.x, rect.y, rect.width, cy1 - rect.y))
    fromY = cy1
  }
  if (cutBottom) {
    r.push(new Rect(rect.x, cy2 + 1, rect.width, rect.y2 - cy2))
    toY = cy2
  }
  if (cutLeft) {
    r.push(new Rect(rect.x, fromY, cx1 - rect.x, toY - fromY + 1))
  }
  if (cutRight) {
    r.push(new Rect(cx2 + 1, fromY, rect.x2 - cx2, toY - fromY + 1))
  }
  return r
}

function splitRectangles(rects: Rect[], by: Rect): void {
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i]
    if (rect.overlaps(by)) {
      const chunks = splitRect(rect, by)
      rects.splice(i, 1, ...chunks)
      i += chunks.length - 1
    }
  }
}
