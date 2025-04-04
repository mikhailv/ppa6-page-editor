import { Pos, Rect } from './rect'

export interface TextBlockFormat {
  center?: true
  shift?: true
}

export class TextBlock {
  readonly lines: string[]
  readonly rect: Rect
  readonly lineOffsets: Pos[]
  readonly lineRects: Rect[]
  readonly format: TextBlockFormat

  constructor(lines: string[], format: TextBlockFormat) {
    return {
      lines,
      rect: new Rect(0, 0, 0, 0),
      lineOffsets: [],
      lineRects: [],
      format,
    }
  }
}
