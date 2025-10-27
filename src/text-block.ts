import { Pos, Rect } from './rect'
import { DrawContext } from "./draw"
import { clamp } from "./util"

export interface TextFormat {
  align?: 'left' | 'center' | 'right'
  shift?: true
  fontSize?: number
  repeat?: number
}

export class TextLine {
  constructor(
    public readonly text: string,
    public readonly format: TextFormat,
    public readonly offset: Pos = new Pos(0, 0),
    public readonly rect: Rect = new Rect(0, 0, 0, 0),
  ) {
  }

  copy(): TextLine {
    return new TextLine(this.text, this.format, this.offset.copy(), this.rect.copy())
  }
}

export class TextBlock {
  constructor(
    public readonly lines: TextLine[] = [],
    public readonly rect: Rect = new Rect(0, 0, 0, 0),
    public readonly innerRect: Rect = new Rect(0, 0, 0, 0)
  ) {
  }

  copy(): TextBlock {
    return new TextBlock(this.lines.map(v => v.copy()), this.rect.copy(), this.innerRect.copy())
  }

  setWidth(width: number) {
    const dx = Math.floor((width - this.rect.width) / 2)
    this.lines.forEach(line => line.rect.x += dx)
    this.innerRect.x += dx
    this.rect.width = width
  }

  setHeight(height: number) {
    const dy = Math.floor((height - this.rect.height) / 2)
    this.lines.forEach(line => line.rect.y += dy)
    this.innerRect.y += dy
    this.rect.height = height
  }
}

function parseTextFormat(line: string): TextFormat {
  const res: TextFormat = {}
  for (const arg of line.slice(2).split(/\s+/)) {
    if (/^x\d+$/.test(arg)) {
      res.repeat = clamp(1, 100, parseInt(arg.slice(1), 10))
    } else if ('left' === arg || 'center' === arg || 'right' === arg) {
      res.align = arg
    } else if ('shift' === arg) {
      res.shift = true
    } else if (/^fs:\d+$/.test(arg)) {
      res.fontSize = Number(arg.substring(3))
    } else {
      console.error(`unknown TextFormat annotation property: '${arg}'`)
    }
  }
  return res
}

export function parseTextBlocks(text: string): TextBlock[] {
  return text.trim()
    .split(/\n(?:\s*\n)+/g)
    .filter(v => v.trim() !== '')
    .map(v => v.split('\n').map(v => v.trim()).filter(v => v !== ''))
    .flatMap((lines: string[]): TextBlock[] => {
      const block = new TextBlock()
      const format: TextFormat = {}
      for (let line of lines) {
        if (line.startsWith('#')) {
          if (line.startsWith('##')) {
            line = line.substring(1)
          } else {
            Object.assign(format, parseTextFormat(line))
            continue
          }
        }
        block.lines.push(new TextLine(line, Object.assign({}, format)))
      }
      if (block.lines.length === 0) {
        console.error('empty TextBlock - maybe annotation declared without text?')
        return []
      }
      const repeat = block.lines[0].format.repeat ?? 1
      if (repeat === 1) {
        return [block]
      }
      return Array.from<unknown, TextBlock>(Array(repeat), () => block.copy())
    })
}

export function measureBlock(drawCtx: DrawContext, block: TextBlock, hPadding: number, vPadding: number): void {
  const { ctx, font } = drawCtx
  ctx.textBaseline = 'top'
  let width = 0
  let height = 0
  for (const [i, line] of block.lines.entries()) {
    drawCtx.fontSize = line.format.fontSize
    const m = ctx.measureText(line.text)
    if (i > 0 && !font.lineHeight) {
      height += Math.round(m.fontBoundingBoxDescent / 4)
    }
    const lineWidth = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight)
    const lineHeight = font.lineHeight ?? Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent)
    line.offset.set(m.actualBoundingBoxLeft, m.actualBoundingBoxAscent)
    line.rect.set(hPadding, vPadding + height, lineWidth, lineHeight)
    width = Math.max(width, lineWidth)
    height += lineHeight
  }
  block.rect.set(0, 0, width + 2 * hPadding + 1, height + 2 * vPadding + 1)
  block.innerRect.set(hPadding, vPadding, width, height)
}
