import { createMutable } from 'solid-js/store'
import { FontDefinition, fonts } from './fonts'
import { BlockLayout, blockLayouts } from './layout'
import { MonochromeThreshold, monochromeThresholds } from './monochrome'
import { deleteUndefined, findByName, structDeepCopy } from './util'

const defaultConfigSaveState: ConfigSaveState = {
  font: 'Iosevka-Regular',
  fontSize: 25,
  text: '',
  padding: [6, 3],
  layout: 'compact',
  borders: true,
  debug: false,
  preview: false,
  monochrome: {
    method: 'Adaptive StdDev',
    threshold: 0,
    blockSize: 15,
  },
}

const defaultLocalStorageStateKey = 'pp6_state'

interface ConfigStore {
  font: FontDefinition
  fontSize: number
  text: string
  padding: { h: number, v: number }
  layout: BlockLayout
  borders: boolean
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
    const save = JSON.parse(localStorage.getItem(key) ?? '{}') as ConfigSaveState
    if (save) {
      Object.assign(store, fromSaveState(save))
    }
  } catch (e) {
    console.error(`failed to load state: ${e}`)
  }
}

function saveConfig(store: ConfigStore, key: string) {
  localStorage.setItem(key, JSON.stringify(toSaveState(store)))
}

interface ConfigSaveState {
  font?: string
  fontSize?: number
  text?: string
  padding?: [number, number]
  layout?: string
  borders?: boolean
  debug?: boolean
  preview?: boolean
  monochrome?: {
    method?: string
    threshold?: number
    blockSize?: number
  }
}

function fromSaveState(save: ConfigSaveState): ConfigStore {
  return deleteUndefined(structDeepCopy({
    font: findByName(fonts, save.font ?? ''),
    fontSize: save.fontSize,
    text: save.text,
    padding: {
      h: save.padding?.[0],
      v: save.padding?.[1],
    },
    layout: findByName(blockLayouts, save.layout ?? ''),
    borders: save.borders,
    debug: save.debug,
    preview: save.preview,
    monochrome: {
      method: findByName(monochromeThresholds, save.monochrome?.method ?? ''),
      threshold: save.monochrome?.threshold,
      blockSize: save.monochrome?.blockSize,
    },
  }))
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
