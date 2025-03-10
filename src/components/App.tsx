import { createEffect, onMount, Show } from 'solid-js'
import Select, { Option } from './Select'
import { FontDefinition, fonts } from '../fonts'
import { blockLayouts } from '../layout'
import { Config } from '../config'
import TextEditor from './TextEditor'
import { Debug } from '../debug'
import { draw, resizeCanvas } from '../draw'
import { TextBlock, TextBlockFormat } from '../text-block'
import { clamp, debounce } from '../util'
import { Rect } from '../rect'
import { monochromeThresholds } from '../monochrome'
import { createProp } from '../util-prop'

const CANVAS_WIDTH = 384
const CANVAS_HEIGHT = 600
const DEBOUNCE_MS = 200

export default (props: { config: Config }) => {
  const { config } = props
  let canvas!: HTMLCanvasElement
  let ctx!: CanvasRenderingContext2D

  const metrics = createProp<string[]>([])

  const fontOptions = makeOptions(fonts)
  const blockLayoutsOptions = makeOptions(blockLayouts)
  const monochromeThresholdOptions = makeOptions(monochromeThresholds)

  const updateText = debounce((text: string) => config.text = text, DEBOUNCE_MS)
  const updateMonochromeThreshold = debounce((val: number) => config.monochrome.threshold = val, DEBOUNCE_MS)

  onMount(() => {
    ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
    resizeCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
    update()
  })

  createEffect(update)

  function update() {
    const debug = new Debug(config.debug && !config.preview)
    render(ctx, debug)
    metrics.set(debug.metrics)
    config.save()
  }

  function blockSizeOptions(): Option<number>[] {
    return config.monochrome.method.blockSizes?.map(size => ({ key: String(size), value: size })) ?? []
  }

  function render(ctx: CanvasRenderingContext2D, debug: Debug) {
    const font = config.font
    const blocks = parseTextBlocks(config.text)

    debug.trackTime('measure_text', () => {
      ctx.font = `${font.size} '${font.name}'` // needed to measure blocks
      for (const block of blocks) {
        measureBlock(ctx, block, font, config.padding.h, config.padding.v)
      }
    })

    debug.trackTime('layout', () =>
      config.layout.apply(blocks, CANVAS_WIDTH, debug),
    )

    debug.trackTime('redraw', () =>
      draw(ctx, CANVAS_HEIGHT, blocks, debug, config.preview, ctx => {
        const { method, threshold, blockSize } = config.monochrome
        method.apply(ctx, threshold * (method.threshold?.step ?? 1), blockSize)
      }),
    )
  }

  return (
    <>
      <h1>PeriPage A6 page editor</h1>
      <div class="row">
        <label>
          Font
          <Select value={config.font.name} options={fontOptions} onInput={config.setFont}/>
          &nbsp;
        </label>
        <label>
          Layout
          <Select value={config.layout.name} options={blockLayoutsOptions} onInput={config.setLayout}/>
          &nbsp;
        </label>
        <label>
          Padding
          h:<input class="padding-size" type="number" min="0"
                   value={config.padding.h}
                   onInput={e => config.padding.h = Number(e.currentTarget.value)}/>
          v:<input class="padding-size" type="number" min="0"
                   value={config.padding.v}
                   onInput={e => config.padding.v = Number(e.currentTarget.value)}/>
          &nbsp;
        </label>
        <label>
          <input type="checkbox" checked={config.debug} disabled={config.preview}
                 onInput={e => config.debug = e.currentTarget.checked}/>
          Debug
          &nbsp;
        </label>
        <label>
          <input type="checkbox" checked={config.preview} onInput={e => config.preview = e.currentTarget.checked}/>
          Preview
          &nbsp;
        </label>
        <label>
          Monochrome
          <Select value={config.monochrome.method.name} options={monochromeThresholdOptions}
                  onInput={config.setMonochromeMethod}/>
          &nbsp;
        </label>
        <Show when={config.monochrome.method.threshold}>
          <label>
            Threshold
            <input class="monochrome-threshold" type="range" min="0" max={config.thresholdSliderMax}
                   value={config.monochrome.threshold}
                   disabled={!config.preview}
                   onInput={e => updateMonochromeThreshold(Number(e.currentTarget.value))}/>
            <span id="monochrome-threshold-value">{config.thresholdValue?.toFixed(2)}</span>
            &nbsp;
          </label>
        </Show>
        <Show when={config.monochrome.method.blockSizes}>
          <label>
            BlockSize
            <Select value={String(config.monochrome.blockSize)} options={blockSizeOptions()}
                    onInput={val => config.monochrome.blockSize = Number(val)}/>
            &nbsp;
          </label>
        </Show>
      </div>

      <div class="preview-container">
        <canvas ref={canvas}/>
        <div>
          <TextEditor value={config.text} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}
                      onInput={updateText}/>
          <pre>{metrics().join('\n')}</pre>
        </div>
      </div>
    </>
  )
}

function parseTextBlocks(text: string): TextBlock[] {
  type Annotation = TextBlockFormat & { repeat: number }

  return text.trim()
    .split(/\n{2,}/g)
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
      } else if ('bold' === arg) {
        res.bold = true
      } else {
        console.error(`unknown TextBlock annotation property: '${arg}'`)
      }
    }
    return [res, true]
  }
}

function measureBlock(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  font: FontDefinition,
  horizontalPadding: number,
  verticalPadding: number,
): void {
  const x = horizontalPadding
  let y = verticalPadding
  let width = 0
  let height = 0
  for (const line of block.lines) {
    const m = ctx.measureText(line)
    //console.log(line, m)
    const lineWidth = Math.round(m.width)
    const lineHeight = font.lineHeight ?? Math.round(m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)
    block.lineRects.push(new Rect(x, y, lineWidth, lineHeight))
    width = Math.max(width, lineWidth)
    height += lineHeight
    y += lineHeight
  }
  block.rect.width = width + 2 * horizontalPadding + 1
  block.rect.height = height + 2 * verticalPadding
}

function makeOptions<T extends { name: string }>(items: T[]): Option<T>[] {
  return items.map(it => ({ key: it.name, value: it }))
}
