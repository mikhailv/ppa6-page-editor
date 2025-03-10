import { Index } from 'solid-js'

export type Option<T> = { key: string, label?: string, value: T }

export default function <T> (props: {
  value?: string,
  options?: Option<T>[],
  onInput?: (value: T) => void,
}) {
  return <select onInput={e => props.onInput?.(props.options?.find(it => it.key === e.currentTarget.value).value)}>
    <Index each={props.options}>
      {item => <option value={item().key} selected={item().key === props.value}>{item().label ?? item().key}</option>}
    </Index>
  </select>
}
