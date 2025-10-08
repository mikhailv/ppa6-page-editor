import { Pos, Rect } from './rect'
import { FontContext } from "./draw"
import { clamp } from "./util"

export interface TextBlockFormat {
  center?: true
  shift?: true
  fontSize?: number
}

export class TextBlock {
  readonly lines: string[]
  readonly rect: Rect
  readonly lineOffsets: Pos[]
  readonly lineRects: Rect[]
  readonly format: TextBlockFormat

  constructor(lines: string[], format: TextBlockFormat) {
    return {
      lines,
      rect: new Rect(0, 0, 0, 0),
      lineOffsets: [],
      lineRects: [],
      format,
    }
  }
}

type Annotation = TextBlockFormat & { repeat: number }

function parseAnnotation(line: string): [Annotation, boolean] {
  const res: Annotation = { repeat: 1 }
  if (!line.startsWith('# ')) {
    return [res, false]
  }
  for (const arg of line.slice(2).split(/\s+/)) {
    if (/^x\d+$/.test(arg)) {
      res.repeat = clamp(1, 100, parseInt(arg.slice(1), 10))
    } else if ('center' === arg) {
      res.center = true
    } else if ('shift' === arg) {
      res.shift = true
    } else if (/^fs:\d+$/.test(arg)) {
      res.fontSize = Number(arg.substring(3))
    } else {
      console.error(`unknown TextBlock annotation property: '${arg}'`)
    }
  }
  return [res, true]
}

export function parseTextBlocks(text: string): TextBlock[] {
  return text.trim()
    .split(/\n(?:\s*\n)+/g)
    .filter(v => v.trim() !== '')
    .map(v => v.split('\n').map(v => v.trim()).filter(v => v !== ''))
    .flatMap((lines: string[]): TextBlock[] => {
      const [annotation, ok] = parseAnnotation(lines[0])
      if (ok) {
        lines.shift()
      }
      if (lines.length === 0) {
        console.error('empty TextBlock - maybe annotation declared without text?')
        return []
      }
      return Array.from<unknown, TextBlock>(Array(annotation.repeat),
        () => new TextBlock(lines, annotation))
    })
}

export function measureBlock(fontCtx: FontContext, block: TextBlock, hPadding: number, vPadding: number): void {
  const { ctx, font } = fontCtx
  ctx.textBaseline = 'top'
  let width = 0
  let height = 0
  for (const [i, line] of block.lines.entries()) {
    fontCtx.fontSize = block.format.fontSize
    const m = ctx.measureText(line)
    if (i > 0 && !font.lineHeight) {
      height += Math.round(m.fontBoundingBoxDescent / 4)
    }
    const lineWidth = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight)
    const lineHeight = font.lineHeight ?? Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    block.lineOffsets.push({ x: m.actualBoundingBoxLeft, y: m.actualBoundingBoxAscent })
    block.lineRects.push(new Rect(hPadding, vPadding + height, lineWidth, lineHeight))
    width = Math.max(width, lineWidth)
    height += lineHeight
  }
  block.rect.width = width + 2 * hPadding + 1
  block.rect.height = height + 2 * vPadding + 1
}
