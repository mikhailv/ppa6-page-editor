import { Rect } from './rect'

export class Debug {
  readonly enabled: boolean
  readonly rects: Rect[] = []
  readonly metrics: string[] = []

  constructor(enabled: boolean) {
    this.enabled = enabled
  }

  reset() {
    this.rects.length = 0
    this.metrics.length = 0
  }

  trackTime(message: string, fn: () => void): void {
    const st = Date.now()
    fn()
    this.metrics.push(`${message}: ${Date.now() - st} ms.`)
  }
}

