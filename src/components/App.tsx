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
import { Printer } from '../ppa6-printer'
import { detectBootstrapBreakpoint } from '../util-bs'

const CANVAS_WIDTH = 384
const CANVAS_HEIGHT = 400
const DEBOUNCE_MS = 200
const DEBUG = new URLSearchParams(location.search).has('debug')

export default (props: { config: Config }) => {
  const { config } = props
  let canvas!: HTMLCanvasElement
  let ctx!: CanvasRenderingContext2D

  const printer = new Printer()

  const metrics = createProp<string[]>([])
  const bsBreakpoint = createProp<string>('')

  const fontOptions = makeOptions(fonts)
  const blockLayoutsOptions = makeOptions(blockLayouts)
  const monochromeThresholdOptions = makeOptions(monochromeThresholds)

  const updateText = debounce((text: string) => config.text = text, DEBOUNCE_MS)
  const updateMonochromeThreshold = debounce((val: number) => config.monochrome.threshold = val, DEBOUNCE_MS)

  if (DEBUG) {
    bsBreakpoint.set(detectBootstrapBreakpoint())
    window.addEventListener('resize', () => bsBreakpoint.set(detectBootstrapBreakpoint()))
  }

  onMount(() => {
    ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true })
    resizeCanvas(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)
    update()
  })

  createEffect(update)

  async function connectAndPrint() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    resizeCanvas(ctx, CANVAS_WIDTH, 1)
    render(ctx, true, new Debug(false))
    await printer.printImage(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }

  function update() {
    const debug = new Debug(config.debug && !config.preview)
    render(ctx, config.preview, debug)
    metrics.set(debug.metrics)
    config.save()
  }

  function blockSizeOptions(): Option<number>[] {
    return config.monochrome.method.blockSizes?.map(size => ({ key: String(size), value: size })) ?? []
  }

  function render(ctx: CanvasRenderingContext2D, preview: boolean, debug: Debug) {
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
      draw(ctx, CANVAS_HEIGHT, blocks, debug, preview, ctx => {
        const { method, blockSize } = config.monochrome
        method.apply(ctx, config.thresholdValue, blockSize)
      }),
    )
  }

  return (
    <>
      {DEBUG ? <div class="bs-breakpoint">{ bsBreakpoint() }</div> : '' }

      <h1 class="mb-3">PeriPage A6 page editor</h1>

      <form class="border px-2 py-1 mb-2">
        <div class="row pt-1">
          <div class="col-auto mb-1">
            <div class="input-group input-group-sm">
              <label for="font-selector" class="input-group-text">Font</label>
              <Select id="font-selector" value={config.font.name} options={fontOptions}
                      onInput={config.setFont}/>
            </div>
          </div>
          <div class="col-auto mb-1">
            <div class="input-group input-group-sm">
              <label for="layout-selector" class="input-group-text">Layout</label>
              <Select id="layout-selector" value={config.layout.name} options={blockLayoutsOptions}
                      onInput={config.setLayout}/>
            </div>
          </div>
          <div class="col-auto mb-1">
            <div class="input-group input-group-sm">
              <label for="padding-h-input" class="input-group-text">Padding h:</label>
              <input id="padding-h-input" class="padding-size form-control" type="number" min="0"
                     value={config.padding.h}
                     onInput={e => config.padding.h = Number(e.currentTarget.value)}/>
              <label for="padding-v-input" class="input-group-text">v:</label>
              <input id="padding-v-input" class="padding-size form-control" type="number" min="0"
                     value={config.padding.v}
                     onInput={e => config.padding.v = Number(e.currentTarget.value)}/>
            </div>
          </div>
          <div class="w-100"></div>
          <div class="col-auto">
            <div class="form-check form-check-sm">
              <input id="preview-checkbox" type="checkbox" class="form-check-input"
                     checked={config.preview}
                     onInput={e => config.preview = e.currentTarget.checked}/>
              <label for="preview-checkbox" class="form-check-label font-sm">Preview</label>
            </div>
          </div>
          <div class="col-auto">
            <div class="form-check">
              <input id="debug-checkbox" type="checkbox" class="form-check-input"
                     checked={config.debug} disabled={config.preview}
                     onInput={e => config.debug = e.currentTarget.checked}/>
              <label for="debug-checkbox" class="form-check-label font-sm">Debug</label>
            </div>
          </div>
        </div>

        <Show when={config.preview}>
          <div class="row py-1">
            <div class="col-auto">
              <div class="input-group input-group-sm">
                <label for="monochrome-selector" class="input-group-text">Monochrome</label>
                <Select id="monochrome-selector"
                        value={config.monochrome.method.name} options={monochromeThresholdOptions}
                        onInput={config.setMonochromeMethod}/>
              </div>
            </div>
            <Show when={config.monochrome.method.threshold}>
              <div class="col-auto">
                <div class="row">
                  <div class="col-auto">
                    <label for="monochrome-threshold" class="form-label font-sm">Threshold</label>
                  </div>
                  <div class="col-auto">
                  <input id="monochrome-threshold" class="monochrome-threshold form-range" type="range" min="0" max={config.thresholdSliderMax}
                         value={config.monochrome.threshold}
                         onInput={e => updateMonochromeThreshold(Number(e.currentTarget.value))}/>
                  </div>
                  <div class="col-auto">
                    <span id="monochrome-threshold-value" class="font-sm">{config.thresholdValue?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Show>
            <Show when={config.monochrome.method.blockSizes}>
              <div class="col-auto">
                <div class="input-group input-group-sm">
                  <label for="monochrome-block-size" class="input-group-text">BlockSize</label>
                  <Select id="monochrome-block-size"
                          value={String(config.monochrome.blockSize)} options={blockSizeOptions()}
                          onInput={val => config.monochrome.blockSize = Number(val)}/>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </form>

      <div class="row g-3 preview-container">
        <div class="col-auto">
          <canvas ref={canvas}/>
        </div>
        <div class="col-auto order-lg-last">
          <button type="button" class="btn btn-sm btn-outline-primary" onClick={() => connectAndPrint().catch(e => console.error(e))}>Print</button>
        </div>
        <div class="col-auto">
          <TextEditor value={config.text} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onInput={updateText}/>
          <div class="metrics-output">{metrics().join('\n')}</div>
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
