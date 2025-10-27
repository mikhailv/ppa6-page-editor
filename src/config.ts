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
  fixedWidth: false,
  fixedHeight: false,
  negative: false,
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
  fixedWidth: boolean
  fixedHeight: boolean
  negative: boolean
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
  encode(): string;
  decode(s: string): void
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
      loadConfigFromJson(config, localStorage.getItem(key) ?? '{}')
    },
    save() {
      localStorage.setItem(key, JSON.stringify(toSaveState(config)))
    },
    encode(): string {
      return btoa(JSON.stringify(toSaveState(config)))
    },
    decode(s: string) {
      loadConfigFromJson(config, atob(s))
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

function loadConfigFromJson(store: ConfigStore, json: string) {
  try {
    const save = JSON.parse(json) as ConfigSaveState
    if (save) {
      Object.assign(store, fromSaveState(save))
    }
  } catch (e) {
    console.error(`failed to load state: ${e}`)
  }
}

interface ConfigSaveState {
  font?: string
  fontSize?: number
  text?: string
  padding?: [number, number]
  fixedWidth?: boolean
  fixedHeight?: boolean
  negative?: boolean
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
    fixedWidth: save.fixedWidth,
    fixedHeight: save.fixedHeight,
    negative: save.negative,
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
