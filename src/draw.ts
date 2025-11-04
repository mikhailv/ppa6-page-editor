import { TextBlock } from './text-block'
import { Debug } from './debug'
import { simpleMonochrome } from './monochrome'
import { FontDefinition } from "./fonts"
import { PRINTER_PAPER_WIDTH } from "./constants"

export type ImageTransform = (ctx: CanvasRenderingContext2D) => void

export class DrawContext {
  private _fontSize: number = -1
  private _realSizeScale: boolean

  constructor(
    public readonly ctx: CanvasRenderingContext2D,
    public readonly font: FontDefinition,
    public readonly defaultFontSize: number,
  ) {
  }

  set fontSize(size: number | undefined | null) {
    const fontSize = this.font.size ?? size ?? this.defaultFontSize
    if (this._fontSize !== fontSize) {
      this.ctx.font = `${fontSize}px '${this.font.family}'`
      this._fontSize = fontSize
    }
  }

  set realSizeScale(val: boolean) {
    if (this._realSizeScale !== val) {
      this._realSizeScale = val
      this.updateCanvasStyles()
    }
  }

  resize(width: number, height: number): boolean {
    const { ctx } = this
    if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
      const oldFont = ctx.font
      ctx.canvas.width = width
      ctx.canvas.height = height
      this.updateCanvasStyles()
      ctx.font = oldFont
      return true
    }
    return false
  }

  private updateCanvasStyles() {
    const { ctx } = this
    const { width, height } = ctx.canvas
    if (this._realSizeScale) {
      ctx.canvas.style.width = PRINTER_PAPER_WIDTH
      ctx.canvas.style.height = Math.floor(ctx.canvas.getBoundingClientRect().width / width * height) + 'px'
    } else {
      ctx.canvas.style.width = width + 'px'
      ctx.canvas.style.height = height + 'px'
    }
  }
}

export function draw(
  drawCtx: DrawContext,
  defaultHeight: number,
  blocks: TextBlock[],
  debug: Debug,
  borders: boolean,
  preview: boolean,
  negative: boolean,
  monochromeTransform: ImageTransform,
) {
  const { ctx } = drawCtx
  let height = 0
  for (const block of blocks) {
    height = Math.max(height, block.rect.y2 + 1)
  }

  if (preview || ctx.canvas.height < height) {
    resizeHeight(height)
  } else if (ctx.canvas.height > defaultHeight && height <= defaultHeight) {
    resizeHeight(defaultHeight)
  }

  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  if (ctx.canvas.height === 0) {
    return
  }

  debug.trackTime('draw_text', () => {
    ctx.textBaseline = 'top'
    for (const block of blocks) {
      const blockNegative = combineNegative(negative, block.format.negative)
      ctx.fillStyle = blockNegative ? 'black' : 'white'
      ctx.fillRect(block.rect.x, block.rect.y, block.rect.width, block.rect.height)
      ctx.fillStyle = blockNegative ? 'white' : 'black'
      block.lines.forEach(line => {
        const { format } = line
        drawCtx.fontSize = format.fontSize
        const shiftX = format.shift ? 0.5 : 0
        const x = block.rect.x + line.offset.x + shiftX
        const y = block.rect.y + line.offset.y + line.rect.y
        let offsetX = line.rect.x
        if (format.align === 'center') {
          offsetX = line.rect.x + Math.floor((block.innerRect.width - line.rect.width) / 2)
        } else if (format.align === 'right') {
          offsetX = line.rect.x + block.innerRect.width - line.rect.width
        }
        ctx.fillText(line.text, x + offsetX, y)
      })
    }
  })

  if (debug.enabled) {
    ctx.strokeStyle = 'red'
    ctx.setLineDash([])
    for (const r of debug.rects) {
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1)
    }
  }

  if (preview) {
    debug.trackTime('monochrome', () =>
      monochromeTransform(ctx)
    )
  }

  if (borders) {
    debug.trackTime('draw_borders', () => {
      ctx.strokeStyle = negative ? 'white' : 'black'
      ctx.setLineDash([1, 7])
      for (const block of blocks) {
        const r = block.rect
        ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.width + (r.x + r.width === ctx.canvas.width ? 1 : 0), r.height)
      }
    })
    if (preview) {
      debug.trackTime('monochrome', () =>
        simpleMonochrome(ctx, negative ? 110 : 150)
      )
    }
  }

  function resizeHeight(height: number) {
    drawCtx.resize(ctx.canvas.width, height)
  }
}

function combineNegative(negative: boolean, v?: true): boolean {
  return v === true ? !negative : negative
}
