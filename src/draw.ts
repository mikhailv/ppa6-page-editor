import { TextBlock } from './text-block'
import { Debug } from './debug'

export type ImageTransform = (ctx: CanvasRenderingContext2D) => void

export function draw(
  ctx: CanvasRenderingContext2D,
  defaultHeight: number,
  blocks: TextBlock[],
  debug: Debug,
  preview: boolean,
  monochromeTransform: ImageTransform,
) {
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
      const r = block.rect
      block.lines.forEach((line, j) => {
        const lineRect = block.lineRects[j]
        const boldX = block.format.bold ? 0.5 : 0
        if (block.format.center) {
          ctx.fillText(line, r.x + Math.floor((block.rect.width - lineRect.width) / 2) + boldX, r.y + lineRect.y)
        } else {
          ctx.fillText(line, r.x + lineRect.x + boldX, r.y + lineRect.y)
        }
      })
    }
  })

  debug.trackTime('draw_borders', () => {
    ctx.fillStyle = 'black'
    ctx.strokeStyle = 'black'
    ctx.setLineDash([1, 7])
    for (const block of blocks) {
      const r = block.rect
      ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.width, r.height)
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
