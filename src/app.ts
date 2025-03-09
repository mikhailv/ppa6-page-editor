import { draw, resizeCanvas } from './draw'
import { defaultFont, FontDefinition, getFont, loadFonts } from './fonts'
import { Rect } from './rect'
import { TextBlock, TextBlockFormat } from './text-block'
import { compactBlockLayout, verticalBlockLayout } from './layout';
import { clamp, debounce } from './util';
import { Debug } from './debug';
import { loadState, saveState, state } from './state';

const CANVAS_WIDTH = 384
const CANVAS_HEIGHT = 600
const DEFERRED_UPDATE_MS = 500

type BlockLayout = (blocks: TextBlock[], maxWidth: number, debug: Debug) => void;

const blockLayouts: Record<string, BlockLayout> = {
  vertical: verticalBlockLayout,
  compact: compactBlockLayout,
}

const fontSelectEl: HTMLSelectElement = document.querySelector('#font-selector')
const layoutSelectEl: HTMLSelectElement = document.querySelector('#layout-selector')
const paddingSizeEl: HTMLInputElement = document.querySelector('#padding-size')
const debugCheckboxEl: HTMLInputElement = document.querySelector("#debug-mode")
const previewCheckboxEl: HTMLInputElement = document.querySelector("#preview-mode")
const monochromeThresholdCheckboxEl: HTMLInputElement = document.querySelector("#monochrome-threshold")
const metricsEl: HTMLPreElement = document.querySelector("#metrics")

const canvasEl: HTMLCanvasElement = document.querySelector("#preview-container canvas")
const textareaEl: HTMLTextAreaElement = document.querySelector("#preview-container textarea")

async function init() {
  loadState()
  const fontNames = await loadFonts()
  initElements(fontNames)
}

function initElements(fontNames: string[]) {
  const ctx = canvasEl.getContext('2d')

  canvasEl.width = CANVAS_WIDTH
  resizeCanvas(ctx, CANVAS_HEIGHT, false)

  textareaEl.style.width = `${CANVAS_WIDTH}px`
  textareaEl.style.height = `${CANVAS_HEIGHT}px`

  initSelect(fontSelectEl, fontNames)
  initSelect(layoutSelectEl, Object.keys(blockLayouts))

  const updateStateImmediate = () => updateState(ctx)
  const updateStateDelayed = debounce(updateStateImmediate, DEFERRED_UPDATE_MS)

  fontSelectEl.addEventListener("change", updateStateImmediate)
  layoutSelectEl.addEventListener("change", updateStateImmediate)
  paddingSizeEl.addEventListener("change", updateStateImmediate)
  debugCheckboxEl.addEventListener("change", updateStateImmediate)
  previewCheckboxEl.addEventListener("change", updateStateImmediate)
  monochromeThresholdCheckboxEl.addEventListener("change", updateStateImmediate)
  textareaEl.addEventListener("keyup", updateStateDelayed)
  textareaEl.addEventListener("blur", updateStateImmediate)

  fontSelectEl.value = state.font
  layoutSelectEl.value = state.layout
  paddingSizeEl.value = String(state.padding)
  debugCheckboxEl.checked = state.debug
  previewCheckboxEl.checked = state.preview
  monochromeThresholdCheckboxEl.value = String(state.monochromeThreshold)
  textareaEl.value = state.text

  updateStateImmediate()
}

function initSelect(el: HTMLSelectElement, values: string[]) {
  for (const value of values) {
    const option = document.createElement("option")
    option.value = value
    option.text = value
    el.appendChild(option)
  }
}

function updateElements() {
  debugCheckboxEl.disabled = state.preview
  monochromeThresholdCheckboxEl.disabled = !state.preview
}

function updateState(ctx: CanvasRenderingContext2D) {
  state.font = fontSelectEl.value
  state.padding = Number(paddingSizeEl.value)
  state.layout = layoutSelectEl.value
  state.debug = debugCheckboxEl.checked
  state.preview = previewCheckboxEl.checked
  state.monochromeThreshold = Number(monochromeThresholdCheckboxEl.value)
  state.text = textareaEl.value
  saveState()

  const debug = new Debug(state.debug && !state.preview)
  render(ctx, debug)
  metricsEl.textContent = debug.metrics.join('\n')
}

function render(ctx: CanvasRenderingContext2D, debug: Debug) {
  updateElements()

  const font = getFont(state.font) ?? defaultFont()
  const blocks = parseTextBlocks()

  debug.trackTime('measure_text', () => {
    ctx.font = `${font.size} '${state.font}'` // needed to measure blocks
    for (const block of blocks) {
      measureBlock(ctx, block, font)
    }
  })

  debug.trackTime('layout', () =>
    blockLayouts[state.layout]?.(blocks, CANVAS_WIDTH, debug)
  )

  debug.trackTime('redraw', () =>
    draw(ctx, CANVAS_HEIGHT, blocks, debug, state.preview, state.monochromeThreshold)
  )
}

function parseTextBlocks(): TextBlock[] {
  type Annotation = TextBlockFormat & { repeat: number }

  return state.text.trim()
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
        return [];
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

function measureBlock(ctx: CanvasRenderingContext2D, block: TextBlock, font: FontDefinition) {
  const x = state.padding
  let y = state.padding
  let width = 0
  let height = 0
  for (const line of block.lines) {
    const m = ctx.measureText(line)
    const lineWidth = Math.round(m.width)
    const lineHeight = font.lineHeight ?? Math.round(m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)
    block.lineRects.push(new Rect(x, y, lineWidth, lineHeight))
    width = Math.max(width, lineWidth)
    height += lineHeight
    y += lineHeight
  }
  block.rect.width = width + 2 * state.padding + 1
  block.rect.height = height + 2 * state.padding
}

(async () => {
  await init()
})()
