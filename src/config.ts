import { createMutable } from 'solid-js/store'
import { FontDefinition, fonts } from './fonts'
import { BlockLayout, blockLayouts } from './layout'
import { MonochromeThreshold, monochromeThresholds } from './monochrome'
import { findByNameOrFirst, structDeepCopy } from './util'

const defaultConfigSaveState: ConfigSaveState = {
  font: 'ArkPixel Prop 12px',
  text: '',
  padding: [3, 3],
  layout: 'compact',
  debug: false,
  preview: false,
  monochrome: {
    method: 'Simple',
    threshold: 1,
    blockSize: 3,
  },
}

const defaultLocalStorageStateKey = 'pp6_state'

interface ConfigStore {
  font: FontDefinition
  text: string
  padding: { h: number, v: number }
  layout: BlockLayout
  debug: boolean
  preview: boolean
  monochrome: {
    method: MonochromeThreshold
    threshold: number
    blockSize: number
  }
}

export interface Config extends ConfigStore {
  load(): void
  save(): void
  setFont(font: FontDefinition): void
  setLayout(layout: BlockLayout): void
  setMonochromeMethod(method: MonochromeThreshold): void
  get thresholdValue(): number
  get thresholdSliderMax(): number
}

export function createConfig(): Config {
  const key = defaultLocalStorageStateKey
  const config = createMutable<Config>({
    ...fromSaveState(defaultConfigSaveState),
    load() {
      loadConfig(config, key)
    },
    save() {
      saveConfig(config, key)
    },
    setFont(font) {
      config.font = structDeepCopy(font)
    },
    setLayout(layout: BlockLayout) {
      config.layout = structDeepCopy(layout)
    },
    setMonochromeMethod(method) {
      config.monochrome.method = structDeepCopy(method)
      if (method.threshold) {
        config.monochrome.threshold = Math.round(method.threshold.min + method.threshold.default / method.threshold.step)
      }
    },
    get thresholdValue(): number {
      const { threshold } = config.monochrome.method
      return threshold ? (threshold.min + config.monochrome.threshold * threshold.step) : 0
    },
    get thresholdSliderMax(): number {
      const { threshold } = config.monochrome.method
      return threshold ? Math.round((threshold.max - threshold.min) / threshold.step) : 0
    },
  })
  return config
}

function loadConfig(store: ConfigStore, key: string) {
  try {
    const save = (JSON.parse(localStorage.getItem(key)) ?? {}) as ConfigSaveState
    //modifyMutable(store, produce(state => Object.assign(state, fromSaveState(save))))
    Object.assign(store, fromSaveState(save))
  } catch (e) {
    console.error(`failed to load state: ${e}`)
  }
}

function saveConfig(store: ConfigStore, key: string) {
  localStorage.setItem(key, JSON.stringify(toSaveState(store)))
}

interface ConfigSaveState {
  font?: string
  text?: string
  padding?: [number, number]
  layout?: string
  debug?: boolean
  preview?: boolean
  monochrome?: {
    method?: string
    threshold?: number
    blockSize?: number
  }
}

function fromSaveState(save: ConfigSaveState): ConfigStore {
  return structDeepCopy({
    font: findByNameOrFirst(fonts, save.font ?? ''),
    text: save.text ?? '',
    padding: { h: save.padding[0], v: save.padding[1] },
    layout: findByNameOrFirst(blockLayouts, save.layout),
    debug: save.debug ?? false,
    preview: save.preview ?? false,
    monochrome: {
      method: findByNameOrFirst(monochromeThresholds, save.monochrome.method),
      threshold: save.monochrome.threshold ?? 0,
      blockSize: save.monochrome.blockSize ?? 1,
    },
  })
}

function toSaveState(cfg: ConfigStore): ConfigSaveState {
  return {
    ...cfg,
    font: cfg.font.name,
    padding: [cfg.padding.h, cfg.padding.v],
    layout: cfg.layout.name,
    monochrome: {
      ...cfg.monochrome,
      method: cfg.monochrome.method.name,
    },
  }
}
