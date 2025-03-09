import { TextBlock } from './text-block';
import { Debug } from './debug';

export function draw(
  ctx: CanvasRenderingContext2D,
  defaultHeight: number,
  blocks: TextBlock[],
  debug: Debug,
  preview: boolean,
  monochromeThreshold: number,
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

  if (debug.enabled) {
    ctx.strokeStyle = 'red'
    for (const r of debug.rects) {
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.width - 1, r.height - 1)
    }
  }

  ctx.textBaseline = 'top'
  ctx.fillStyle = 'black'
  ctx.strokeStyle = 'rgba(128, 128, 128, 1)'

  debug.trackTime('draw_text', () => {
    for (const block of blocks) {
      const r = block.rect
      ctx.strokeRect(r.x - 0.5, r.y - 0.5, r.width, r.height)
      block.lines.forEach((line, j) => {
        const lineRect = block.lineRects[j]
        const boldX = block.format.bold ? 0.5 : 0;
        if (block.format.center) {
          ctx.fillText(line, r.x + Math.floor((block.rect.width - lineRect.width) / 2) + boldX, r.y + lineRect.y)
        } else {
          ctx.fillText(line, r.x + lineRect.x + boldX, r.y + lineRect.y)
        }
      })
    }
  })

  if (preview) {
    debug.trackTime('monochrome', () =>
      convertToMonochrome(ctx, monochromeThreshold),
    )
  }

  function resizeHeight(height: number) {
    resizeCanvas(ctx, height, false)
  }
}

export function resizeCanvas(ctx: CanvasRenderingContext2D, height: number, keepContent: boolean): boolean {
  if (ctx.canvas.height !== height) {
    let data: ImageData
    if (keepContent) {
      data = ctx.getImageData(0, 0, ctx.canvas.width, height)
    }
    const oldFont = ctx.font
    ctx.canvas.height = height
    ctx.canvas.style.height = height + 'px'
    ctx.font = oldFont
    if (data) {
      ctx.putImageData(data, 0, 0)
    }
    return true
  }
  return false
}

function convertToMonochrome(ctx: CanvasRenderingContext2D, threshold = 128) {
  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i]
    const green = data[i + 1]
    const blue = data[i + 2]
    const grayscale = 0.299 * red + 0.587 * green + 0.114 * blue
    const monochrome = grayscale >= threshold ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = monochrome
  }
  ctx.putImageData(imageData, 0, 0)
}
