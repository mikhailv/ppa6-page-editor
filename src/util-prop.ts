import { createSignal } from 'solid-js'

export interface Prop<T> {
  (): T
  set(value: T): void
}

export function createProp<T>(value: T): Prop<T> {
  const [get, set] = createSignal<T>(value)
  const prop = get as Prop<T>
  prop.set = set
  return prop
}
