import { TextBlock } from './text-block'
import { Debug } from './debug'
import { simpleMonochrome } from './monochrome'
import { FontDefinition } from "./fonts"

export type ImageTransform = (ctx: CanvasRenderingContext2D) => void

export class FontContext {
  private activeFontSize: number = -1

  constructor(
    public readonly ctx: CanvasRenderingContext2D,
    public readonly font: FontDefinition,
    public readonly defaultFontSize: number,
  ) {
  }

  set fontSize(size: number | undefined | null) {
    const fontSize = this.font.size ?? size ?? this.defaultFontSize
    if (this.activeFontSize !== fontSize) {
      this.ctx.font = `${fontSize}px '${this.font.family}'`
      this.activeFontSize = fontSize
    }
  }
}

export function draw(
  fontCtx: FontContext,
  defaultHeight: number,
  blocks: TextBlock[],
  debug: Debug,
  borders: boolean,
  preview: boolean,
  monochromeTransform: ImageTransform,
) {
  const { ctx } = fontCtx
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
    ctx.fillStyle = 'black'
    for (const block of blocks) {
      block.lines.forEach(line => {
        const { format } = line
        fontCtx.fontSize = format.fontSize
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
      ctx.fillStyle = 'black'
      ctx.strokeStyle = 'black'
      ctx.setLineDash([1, 7])
      for (const block of blocks) {
        const r = block.rect
        ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.width + (r.x + r.width === ctx.canvas.width ? 1 : 0), r.height)
      }
    })
    if (preview) {
      debug.trackTime('monochrome', () =>
        simpleMonochrome(ctx, 128)
      )
    }
  }

  function resizeHeight(height: number) {
    resizeCanvas(ctx, ctx.canvas.width, height)
  }
}

export function resizeCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  if (ctx.canvas.width !== width || ctx.canvas.height !== height) {
    const oldFont = ctx.font
    ctx.canvas.width = width
    ctx.canvas.height = height
    ctx.canvas.style.width = width + 'px'
    ctx.canvas.style.height = height + 'px'
    ctx.font = oldFont
    return true
  }
  return false
}
