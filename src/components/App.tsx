import { createEffect, onMount, Show } from 'solid-js'
import Select, { Option } from './Select'
import { fonts } from '../fonts'
import { blockLayouts } from '../layout'
import { Config } from '../config'
import TextEditor from './TextEditor'
import { Debug } from '../debug'
import { draw, FontContext, resizeCanvas } from '../draw'
import { measureBlock, parseTextBlocks } from '../text-block'
import { debounce } from '../util'
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
    render(ctx, config.borders, true, new Debug(false))
    await printer.printImage(ctx.getImageData(0, 0, canvas.width, canvas.height))
  }

  function update() {
    const debug = new Debug(config.debug && !config.preview)
    render(ctx, config.borders, config.preview, debug)
    metrics.set(debug.metrics)
    config.save()
    location.hash = config.encode()
  }

  function blockSizeOptions(): Option<number>[] {
    return config.monochrome.method.blockSizes?.map(size => ({ key: String(size), value: size })) ?? []
  }

  function render(ctx: CanvasRenderingContext2D, borders: boolean, preview: boolean, debug: Debug) {
    const blocks = parseTextBlocks(config.text)
    const fontCtx = new FontContext(ctx, config.font, config.fontSize)

    debug.trackTime('measure_text', () => {
      for (const block of blocks) {
        measureBlock(fontCtx, block, config.padding.h, config.padding.v)
      }
    })

    debug.trackTime('layout', () =>
      config.layout.apply(blocks, CANVAS_WIDTH, debug),
    )

    debug.trackTime('redraw', () =>
      draw(fontCtx, CANVAS_HEIGHT, blocks, debug, borders, preview, ctx => {
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
              <input id="font-size-input" class="form-control" type="number" min="1" max="100"
                     disabled={config.font.size != null}
                     value={config.font.size ?? config.fontSize}
                     onInput={e => config.fontSize = Number(e.currentTarget.value)}/>
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
              <input id="padding-h-input" class="form-control" type="number" min="0" max="100"
                     value={config.padding.h}
                     onInput={e => config.padding.h = Number(e.currentTarget.value)}/>
              <label for="padding-v-input" class="input-group-text">v:</label>
              <input id="padding-v-input" class="form-control" type="number" min="0" max="100"
                     value={config.padding.v}
                     onInput={e => config.padding.v = Number(e.currentTarget.value)}/>
            </div>
          </div>
          <div class="w-100"></div>
          <div class="col-auto">
            <div class="form-check form-check-sm">
              <input id="borders-checkbox" type="checkbox" class="form-check-input"
                     checked={config.borders}
                     onInput={e => config.borders = e.currentTarget.checked}/>
              <label for="borders-checkbox" class="form-check-label font-sm">Borders</label>
            </div>
          </div>
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
        <div class="col-auto">
          <button type="button" class="btn btn-sm btn-outline-primary" onClick={() => connectAndPrint().catch(e => console.error(e))}>Print</button>
        </div>
        <div class="col-auto order-lg-first">
          <TextEditor value={config.text} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onInput={updateText}/>
          <div class="metrics-output">{metrics().join('\n')}</div>
        </div>
      </div>
    </>
  )
}

function makeOptions<T extends { name: string }>(items: T[]): Option<T>[] {
  return items.map(it => ({ key: it.name, value: it }))
}
