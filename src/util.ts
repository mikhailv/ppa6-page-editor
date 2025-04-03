import { Rect } from './rect'
import { produce } from 'solid-js/store'

export function sortBy<T, R>(values: T[], mapper: (v: T) => R): void {
  values.sort((a, b) => {
    const v1 = mapper(a)
    const v2 = mapper(b)
    if (v1 == v2) {
      return 0
    }
    return v1 < v2 ? -1 : 1
  })
}

export function sortRectsByPosition(rects: Rect[]): void {
  rects.sort((a, b) => {
    if (a.y === b.y) {
      return a.x - b.x
    }
    return a.y - b.y
  })
}

export function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>): void {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(this, args), wait)
  } as T
}

export function clamp(min: number, max: number, v: number): number {
  return Math.max(min, Math.min(max, v))
}

export function findByName<T extends { name: string }>(items: T[], name: string, def?: T): T | undefined {
  return items.find(item => item.name === name) ?? def
}

export function findByNameOrFirst<T extends { name: string }>(items: T[], name: string): T | undefined {
  return findByName(items, name, items[0])
}

export function overrideProps<T extends object>(obj: T) {
  return produce<T>(draft => {
    Object.assign(draft, obj)
    for (const prop of Object.keys(draft)) {
      if (!Object.hasOwn(obj, prop)) {
        draft[prop] = undefined
      }
    }
  })
}

export function structDeepCopy<T extends object>(obj: T): T {
  if (!isPlainObject(obj)) {
    return obj
  }
  const copy: T = {} as T
  for (const key of Object.keys(obj)) {
    copy[key] = mapValue(obj[key])
  }
  return copy

  function mapValue(val: unknown): unknown {
    if (Array.isArray(val)) {
      val = val.map(mapValue)
    } else if (isPlainObject(val)) {
      val = structDeepCopy(val)
    }
    return val
  }
}

export function isPlainObject(val: unknown): val is object {
  return val && typeof val === 'object' && (val.constructor === undefined || val.constructor === Object)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function deleteUndefined<T extends object>(obj: T): T | undefined {
  if (!isPlainObject(obj)) {
    return obj
  }
  return mapObject(obj)

  function mapObject<T extends object>(obj: T): T | undefined {
    const keys = Object.keys(obj)
    for (const key of keys) {
      if (isPlainObject(obj[key])) {
        obj[key] = mapObject(obj[key])
      }
      if (obj[key] === undefined) {
        delete obj[key]
      }
    }
    if (Object.keys(obj).length === 0 && keys.length > 0) {
      return undefined
    }
    return obj
  }
}
