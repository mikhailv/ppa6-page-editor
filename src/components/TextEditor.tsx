export default (props: {
  value?: string,
  onInput?: (value: string) => void,
  width?: number,
  height?: number,
}) => {
  return (
    <textarea onInput={e => props.onInput(e.currentTarget.value)}
              style={{ width: `${props.width ?? 0}px`, height: `${props.height ?? 0}px` }}
              // @ts-expect-error ignore
              prop:spellcheck={false}
              value={props.value} />
  )
}
